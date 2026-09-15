import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import { EntitlementsService } from "../entitlements/entitlements.service";
import {
  extractInboundSms,
  parseAccountRef,
  parseSafaricomConfirmationSms,
} from "./sms-gateway.parser";

const MPESA_CONFIG_SECRET_MIN_LENGTH = 32;

type ConfigInput = {
  shortcode?: string;
  environment?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  isActive?: boolean;
  accountType?: string;
  listenerPhone?: string;
  storeOwnerName?: string;
};

type ParsedC2BPayload = {
  shortcode: string;
  billRefNumber: string;
  normalizedAccount: string;
  transId: string;
  amount: number;
  phoneNumber: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  transTime: Date | null;
};

@Injectable()
export class MpesaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentLedger: RentLedgerService,
    private readonly propertyAccess: PropertyAccessService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getConfig(tenant: TenantContext) {
    const config = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) return { configured: false };
    return this.toConfigResponse(config);
  }

  async saveConfig(tenant: TenantContext, input: ConfigInput) {
    const shortcode = String(input.shortcode || "").trim();
    if (!shortcode) throw new BadRequestException("PayBill shortcode is required");

    const existing = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    const data: any = {
      shortcode,
      environment: input.environment === "sandbox" ? "sandbox" : "production",
      isActive: input.isActive !== false,
      accountType: input.accountType === "till" ? "till" : "paybill",
      listenerPhone: this.normalizePhone(input.listenerPhone),
      storeOwnerName: String(input.storeOwnerName || "").trim() || null,
    };
    if (input.consumerKey) data.consumerKeyEncrypted = this.encrypt(input.consumerKey);
    if (input.consumerSecret)
      data.consumerSecretEncrypted = this.encrypt(input.consumerSecret);
    if (input.passkey) data.passkeyEncrypted = this.encrypt(input.passkey);

    const saved = existing
      ? await this.prisma.organizationMpesaConfig.update({
          where: { organizationId: tenant.organizationId },
          data,
        })
      : await this.prisma.organizationMpesaConfig.create({
          data: {
            ...data,
            organizationId: tenant.organizationId,
          },
        });

    return this.toConfigResponse(saved);
  }

  async rotateSmsGatewayToken(tenant: TenantContext) {
    const config = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) {
      throw new BadRequestException("Save the PayBill / Till shortcode first");
    }
    const token = `sgw_${randomBytes(24).toString("hex")}`;
    await this.prisma.organizationMpesaConfig.update({
      where: { organizationId: tenant.organizationId },
      data: { smsGatewayTokenHash: this.hashToken(token) },
    });
    return {
      token,
      inboundPath: "/sms-gateway/inbound",
      hasSmsGatewayToken: true,
    };
  }

  async createPairingOtp(tenant: TenantContext) {
    const config = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) {
      throw new BadRequestException("Save the PayBill / Till shortcode first");
    }

    let otp = "";
    let otpHash = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      otp = String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
      otpHash = this.hashToken(`otp:${otp}`);
      const clash = await this.prisma.organizationMpesaConfig.findFirst({
        where: {
          pairingOtpHash: otpHash,
          pairingOtpExpiresAt: { gt: new Date() },
        },
      });
      if (!clash) break;
      otp = "";
    }
    if (!otp) throw new BadRequestException("Could not issue a pairing code. Try again.");

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.organizationMpesaConfig.update({
      where: { organizationId: tenant.organizationId },
      data: { pairingOtpHash: otpHash, pairingOtpExpiresAt: expiresAt },
    });

    return { otp, expiresAt };
  }

  async pairSmsGateway(input: { otp?: string; sim?: string; deviceName?: string }) {
    const otp = String(input.otp || "").replace(/\D/g, "");
    if (otp.length !== 6) throw new BadRequestException("Enter the 6-digit pairing code");

    const config = await this.prisma.organizationMpesaConfig.findFirst({
      where: {
        pairingOtpHash: this.hashToken(`otp:${otp}`),
        pairingOtpExpiresAt: { gt: new Date() },
        isActive: true,
      },
      include: { organization: { select: { name: true, slug: true } } },
    });
    if (!config) throw new UnauthorizedException("Invalid or expired pairing code");

    const token = `sgw_${randomBytes(24).toString("hex")}`;
    const sim = this.normalizePhone(input.sim);
    await this.prisma.organizationMpesaConfig.update({
      where: { id: config.id },
      data: {
        smsGatewayTokenHash: this.hashToken(token),
        pairingOtpHash: null,
        pairingOtpExpiresAt: null,
        pairedDeviceName: String(input.deviceName || "").trim() || "Android SMS listener",
        pairedAt: new Date(),
        ...(sim ? { listenerPhone: sim } : {}),
      },
    });

    return {
      ok: true,
      token,
      inboundPath: "/sms-gateway/inbound",
      organizationName: config.organization.name,
      shortcode: config.shortcode,
      accountType: config.accountType || "paybill",
    };
  }

  async registerUrl(tenant: TenantContext) {
    const config = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) throw new BadRequestException("M-Pesa config is not set");
    if (!config.consumerKeyEncrypted || !config.consumerSecretEncrypted) {
      throw new BadRequestException("Consumer key and secret are required");
    }

    const token = await this.getAccessToken(config);
    const baseUrl =
      config.environment === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke";
    const appUrl = this.resolveAppUrl();
    const response = await fetch(`${baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: config.shortcode,
        ResponseType: "Completed",
        ConfirmationURL: `${appUrl}/api/mpesa/c2b/confirmation`,
        ValidationURL: `${appUrl}/api/mpesa/c2b/validation`,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new BadRequestException(
        payload?.errorMessage || payload?.ResponseDescription || "Daraja rejected URL registration",
      );
    }

    await this.prisma.organizationMpesaConfig.update({
      where: { organizationId: tenant.organizationId },
      data: { registeredAt: new Date() },
    });

    return payload;
  }

  validateC2B(_payload: any) {
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  async confirmC2B(payload: any) {
    const parsed = this.parseC2BPayload(payload);
    await this.ingestParsed(parsed, payload, { source: "c2b" });
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  async inboundSms(payload: any, token?: string) {
    const gatewayToken = String(
      token || payload?.token || payload?.secret || "",
    ).trim();
    if (!gatewayToken) throw new UnauthorizedException("Gateway token is required");

    const config = await this.prisma.organizationMpesaConfig.findFirst({
      where: { smsGatewayTokenHash: this.hashToken(gatewayToken), isActive: true },
    });
    if (!config) throw new UnauthorizedException("Invalid SMS gateway token");

    const { from, text } = extractInboundSms(payload);
    if (!text) throw new BadRequestException("SMS text is required");

    const parsed = parseSafaricomConfirmationSms(text, config.shortcode);
    if (!parsed) {
      throw new BadRequestException(
        "Could not parse amount from this SMS. Forward the full Safaricom confirmation message.",
      );
    }

    await this.prisma.organizationMpesaConfig.update({
      where: { id: config.id },
      data: { smsGatewayLastAt: new Date(), lastCallbackAt: new Date() },
    });

    const result = await this.ingestParsed(
      parsed,
      { from, text, ...payload },
      {
        source: "sms_gateway",
        rawSms: parsed.rawSms,
        organizationId: config.organizationId,
        skipAddonCheck: true,
      },
    );

    return {
      ok: true,
      transId: parsed.transId,
      amount: parsed.amount,
      account: parsed.billRefNumber,
      unit: parsed.normalizedAccount,
      status: result.status,
      matchReason: result.matchReason,
    };
  }

  async listUnassigned(tenant: TenantContext, query?: string) {
    const q = String(query || "").trim();
    const rows = await this.prisma.mpesaTransaction.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: { in: ["unmatched", "ambiguous"] },
        ...(q
          ? {
              OR: [
                { transId: { contains: q, mode: "insensitive" } },
                { billRefNumber: { contains: q, mode: "insensitive" } },
                { normalizedAccount: { contains: q, mode: "insensitive" } },
                { phoneNumber: { contains: q, mode: "insensitive" } },
                { rawSms: { contains: q, mode: "insensitive" } },
                { matchReason: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => this.toSnake(row));
  }

  async assignTransaction(
    tenant: TenantContext,
    transactionId: string,
    tenantId?: string,
  ) {
    if (!tenantId) throw new BadRequestException("Tenant is required");
    const transaction = await this.prisma.mpesaTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId: tenant.organizationId,
        status: { in: ["unmatched", "ambiguous"] },
      },
    });
    if (!transaction) throw new NotFoundException("M-Pesa transaction not found");

    const tenantRow = await this.prisma.tenant.findFirst({
      where: this.propertyAccess.scopeWhere("tenants", tenant, {
        id: tenantId,
        organizationId: tenant.organizationId,
      }),
    });
    if (!tenantRow) throw new NotFoundException("Tenant not found");

    const payment = await this.createPaymentForTenant(tenant.organizationId, tenantId, {
      transId: transaction.transId,
      amount: Number(transaction.amount),
      transTime: transaction.transTime,
    } as ParsedC2BPayload);

    const updated = await this.prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "matched",
        matchReason: "Manually assigned",
        matchedTenantId: tenantId,
        paymentId: payment.id,
      },
    });

    return this.toSnake(updated);
  }

  private async createPaymentForTenant(
    organizationId: string,
    tenantId: string,
    parsed: Pick<ParsedC2BPayload, "transId" | "amount" | "transTime">,
  ) {
    const existingPayment = await this.prisma.payment.findFirst({
      where: { organizationId, reference: parsed.transId },
    });
    if (existingPayment) return existingPayment;

    const payment = await this.prisma.payment.create({
      data: {
        organizationId,
        tenantId,
        amount: parsed.amount,
        paymentDate: parsed.transTime || new Date(),
        method: "mpesa",
        reference: parsed.transId,
      },
    });
    await this.rentLedger.applyPayment(
      {
        organizationId,
        organizationSlug: "",
        membershipId: "",
        userId: "",
        role: "OWNER",
        propertyAccessScope: "ALL",
        propertyIds: [],
      },
      payment,
    );
    return payment;
  }

  private async createTransaction(
    parsed: ParsedC2BPayload,
    rawPayload: any,
    options: {
      organizationId?: string;
      status: string;
      reason: string;
      matchedTenantId?: string;
      paymentId?: string;
      source?: string;
      rawSms?: string | null;
    },
  ) {
    return this.prisma.mpesaTransaction.create({
      data: {
        organizationId: options.organizationId,
        shortcode: parsed.shortcode,
        billRefNumber: parsed.billRefNumber,
        normalizedAccount: parsed.normalizedAccount,
        transId: parsed.transId,
        amount: parsed.amount,
        phoneNumber: parsed.phoneNumber,
        payerFirstName: parsed.firstName,
        payerMiddleName: parsed.middleName,
        payerLastName: parsed.lastName,
        transTime: parsed.transTime,
        status: options.status,
        matchReason: options.reason,
        matchedTenantId: options.matchedTenantId,
        paymentId: options.paymentId,
        source: options.source || "c2b",
        rawSms: options.rawSms || null,
        rawPayload,
      },
    });
  }

  private async ingestParsed(
    parsed: ParsedC2BPayload,
    payload: any,
    options: {
      source: string;
      rawSms?: string | null;
      organizationId?: string;
      skipAddonCheck?: boolean;
    },
  ) {
    const existing = await this.prisma.mpesaTransaction.findUnique({
      where: { transId: parsed.transId },
    });
    if (existing) {
      return { status: existing.status, matchReason: existing.matchReason || "Already stored" };
    }

    let organizationId = options.organizationId;
    if (!organizationId) {
      const config = await this.prisma.organizationMpesaConfig.findFirst({
        where: { shortcode: parsed.shortcode, isActive: true },
      });
      if (!config) {
        const row = await this.createTransaction(parsed, payload, {
          status: "unmatched",
          reason: "No active organization is configured for this PayBill shortcode",
          source: options.source,
          rawSms: options.rawSms,
        });
        return { status: row.status, matchReason: row.matchReason };
      }
      organizationId = config.organizationId;
      await this.prisma.organizationMpesaConfig.update({
        where: { organizationId },
        data: { lastCallbackAt: new Date() },
      });
    }

    if (
      !options.skipAddonCheck &&
      !(await this.entitlements.hasAddons(organizationId, ["mpesa"]))
    ) {
      const row = await this.createTransaction(parsed, payload, {
        organizationId,
        status: "unmatched",
        reason: "M-Pesa add-on is disabled for this organization",
        source: options.source,
        rawSms: options.rawSms,
      });
      return { status: row.status, matchReason: row.matchReason };
    }

    const candidates = await this.findTenantCandidates(
      organizationId,
      parsed.normalizedAccount,
    );

    if (candidates.length !== 1) {
      const row = await this.createTransaction(parsed, payload, {
        organizationId,
        status: candidates.length > 1 ? "ambiguous" : "unmatched",
        reason:
          candidates.length > 1
            ? "More than one active tenant uses this unit number"
            : "No active tenant unit matches the account after #",
        source: options.source,
        rawSms: options.rawSms,
      });
      return { status: row.status, matchReason: row.matchReason };
    }

    const payment = await this.createPaymentForTenant(
      organizationId,
      candidates[0].id,
      parsed,
    );
    const row = await this.createTransaction(parsed, payload, {
      organizationId,
      status: "matched",
      reason: "Matched by unit number after #",
      matchedTenantId: candidates[0].id,
      paymentId: payment.id,
      source: options.source,
      rawSms: options.rawSms,
    });
    return { status: row.status, matchReason: row.matchReason };
  }

  private async findTenantCandidates(organizationId: string, normalizedAccount: string) {
    if (!normalizedAccount) return [];
    return this.prisma.tenant.findMany({
      where: {
        organizationId,
        status: { in: ["Active", "active"] },
        unit: {
          unitNumber: { equals: normalizedAccount, mode: "insensitive" },
        },
      },
      select: { id: true },
    });
  }

  private parseC2BPayload(payload: any): ParsedC2BPayload {
    const shortcode = String(
      payload.BusinessShortCode || payload.ShortCode || payload.shortcode || "",
    ).trim();
    const billRefNumber = String(
      payload.BillRefNumber || payload.AccountNumber || payload.billRefNumber || "",
    ).trim();
    const transId = String(payload.TransID || payload.TransId || payload.transId || "").trim();
    const amount = Number(payload.TransAmount || payload.Amount || payload.amount || 0);

    if (!shortcode) throw new BadRequestException("BusinessShortCode is missing");
    if (!transId) throw new BadRequestException("TransID is missing");
    if (!amount || amount <= 0) throw new BadRequestException("TransAmount is invalid");

    return {
      shortcode,
      billRefNumber,
      normalizedAccount: this.normalizeAccount(billRefNumber),
      transId,
      amount,
      phoneNumber: payload.MSISDN ? String(payload.MSISDN) : null,
      firstName: payload.FirstName ? String(payload.FirstName) : null,
      middleName: payload.MiddleName ? String(payload.MiddleName) : null,
      lastName: payload.LastName ? String(payload.LastName) : null,
      transTime: this.parseMpesaTime(payload.TransTime),
    };
  }

  private normalizeAccount(value: string) {
    return parseAccountRef(value).unitNumber;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(String(token || "")).digest("hex");
  }

  private toConfigResponse(config: {
    shortcode: string;
    environment: string;
    isActive: boolean;
    consumerKeyEncrypted: string | null;
    consumerSecretEncrypted: string | null;
    passkeyEncrypted: string | null;
    registeredAt: Date | null;
    lastCallbackAt: Date | null;
    smsGatewayTokenHash?: string | null;
    smsGatewayLastAt?: Date | null;
    accountType?: string | null;
    listenerPhone?: string | null;
    storeOwnerName?: string | null;
    pairingOtpHash?: string | null;
    pairingOtpExpiresAt?: Date | null;
    pairedDeviceName?: string | null;
    pairedAt?: Date | null;
  }) {
    return {
      configured: true,
      shortcode: config.shortcode,
      environment: config.environment,
      isActive: config.isActive,
      hasConsumerKey: Boolean(config.consumerKeyEncrypted),
      hasConsumerSecret: Boolean(config.consumerSecretEncrypted),
      hasPasskey: Boolean(config.passkeyEncrypted),
      registeredAt: config.registeredAt,
      lastCallbackAt: config.lastCallbackAt,
      hasSmsGatewayToken: Boolean(config.smsGatewayTokenHash),
      smsGatewayLastAt: config.smsGatewayLastAt || null,
      accountType: config.accountType || "paybill",
      listenerPhone: config.listenerPhone || null,
      storeOwnerName: config.storeOwnerName || null,
      pairingOtpExpiresAt: config.pairingOtpExpiresAt || null,
      pairedDeviceName: config.pairedDeviceName || null,
      pairedAt: config.pairedAt || null,
    };
  }

  private normalizePhone(value?: string | null) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("254") && digits.length === 12) return digits;
    if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
    if (digits.length === 9) return `254${digits}`;
    return digits;
  }

  private parseMpesaTime(value: unknown) {
    const raw = String(value || "");
    if (!/^\d{14}$/.test(raw)) return null;
    return new Date(
      Number(raw.slice(0, 4)),
      Number(raw.slice(4, 6)) - 1,
      Number(raw.slice(6, 8)),
      Number(raw.slice(8, 10)),
      Number(raw.slice(10, 12)),
      Number(raw.slice(12, 14)),
    );
  }

  private async getAccessToken(config: any) {
    const consumerKey = this.decrypt(config.consumerKeyEncrypted);
    const consumerSecret = this.decrypt(config.consumerSecretEncrypted);
    const baseUrl =
      config.environment === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke";
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const response = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
      throw new BadRequestException(payload?.errorMessage || "Could not get Daraja token");
    }
    return payload.access_token;
  }

  private encrypt(value: string) {
    const key = this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
  }

  private decrypt(value: string) {
    const [ivRaw, tagRaw, encryptedRaw] = String(value || "").split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) return "";
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey(),
      Buffer.from(ivRaw, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private encryptionKey() {
    const secret = process.env.MPESA_CONFIG_SECRET || process.env.AUTH_SECRET || "";
    if (secret.length < MPESA_CONFIG_SECRET_MIN_LENGTH) {
      throw new BadRequestException(
        "MPESA_CONFIG_SECRET must be at least 32 characters before saving M-Pesa keys",
      );
    }
    return createHash("sha256").update(secret).digest();
  }

  private resolveAppUrl() {
    const url = process.env.APP_BASE_URL || process.env.WEB_APP_URL;
    if (!url) throw new BadRequestException("APP_BASE_URL is not configured");
    return url.replace(/\/+$/, "");
  }

  private toSnake(row: any) {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)] = value;
    }
    return out;
  }
}
