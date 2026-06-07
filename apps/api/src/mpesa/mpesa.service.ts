import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import type { TenantContext } from "../tenancy/tenant-context";

const MPESA_CONFIG_SECRET_MIN_LENGTH = 32;

type ConfigInput = {
  shortcode?: string;
  environment?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  isActive?: boolean;
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
  ) {}

  async getConfig(tenant: TenantContext) {
    const config = await this.prisma.organizationMpesaConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) return { configured: false };
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
    };
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

    return {
      configured: true,
      shortcode: saved.shortcode,
      environment: saved.environment,
      isActive: saved.isActive,
      hasConsumerKey: Boolean(saved.consumerKeyEncrypted),
      hasConsumerSecret: Boolean(saved.consumerSecretEncrypted),
      hasPasskey: Boolean(saved.passkeyEncrypted),
      registeredAt: saved.registeredAt,
      lastCallbackAt: saved.lastCallbackAt,
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
    const existing = await this.prisma.mpesaTransaction.findUnique({
      where: { transId: parsed.transId },
    });
    if (existing) return { ResultCode: 0, ResultDesc: "Accepted" };

    const config = await this.prisma.organizationMpesaConfig.findFirst({
      where: { shortcode: parsed.shortcode, isActive: true },
    });

    if (!config) {
      await this.createTransaction(parsed, payload, {
        status: "unmatched",
        reason: "No active organization is configured for this PayBill shortcode",
      });
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    await this.prisma.organizationMpesaConfig.update({
      where: { organizationId: config.organizationId },
      data: { lastCallbackAt: new Date() },
    });

    const candidates = await this.findTenantCandidates(
      config.organizationId,
      parsed.normalizedAccount,
    );

    if (candidates.length !== 1) {
      await this.createTransaction(parsed, payload, {
        organizationId: config.organizationId,
        status: candidates.length > 1 ? "ambiguous" : "unmatched",
        reason:
          candidates.length > 1
            ? "More than one active tenant uses this unit number"
            : "No active tenant unit matches the M-Pesa account number",
      });
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    const payment = await this.createPaymentForTenant(
      config.organizationId,
      candidates[0].id,
      parsed,
    );
    await this.createTransaction(parsed, payload, {
      organizationId: config.organizationId,
      status: "matched",
      reason: "Matched by PayBill shortcode and unit number",
      matchedTenantId: candidates[0].id,
      paymentId: payment.id,
    });

    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  async listUnassigned(tenant: TenantContext) {
    const rows = await this.prisma.mpesaTransaction.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: { in: ["unmatched", "ambiguous"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
      where: { id: tenantId, organizationId: tenant.organizationId },
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
    await this.rentLedger.applyPayment({ organizationId, organizationSlug: "" }, payment);
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
        rawPayload,
      },
    });
  }

  private async findTenantCandidates(organizationId: string, normalizedAccount: string) {
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
    return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
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
