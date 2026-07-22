import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

type SendSmsInput = {
  phoneNumbers?: string[];
  message?: string;
  messages?: {
    phoneNumber?: string;
    message?: string;
  }[];
};

type SmsRecipient = {
  phoneNumber: string;
  message: string;
};

type SmsConfigInput = {
  provider?: string;
  partnerId?: string;
  apiKey?: string;
  senderId?: string;
  isActive?: boolean;
};

type ResolvedSmsConfig = {
  provider: "emalify";
  partnerId: string;
  apiKey: string;
  senderId: string;
  source: "organization" | "environment";
};

const SMS_CONFIG_SECRET_MIN_LENGTH = 32;

@Injectable()
export class SmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(tenant: TenantContext) {
    const config = await this.prisma.organizationSmsConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (!config) {
      return {
        configured: false,
        provider: "emalify",
        usesEnvironmentFallback: this.hasEnvironmentFallback(),
      };
    }
    return {
      configured: true,
      provider: config.provider,
      senderId: config.senderId,
      isActive: config.isActive,
      hasPartnerId: Boolean(config.partnerIdEncrypted),
      hasApiKey: Boolean(config.apiKeyEncrypted),
      usesEnvironmentFallback: false,
      lastBalanceCheckAt: config.lastBalanceCheckAt,
      lastSentAt: config.lastSentAt,
    };
  }

  async saveConfig(tenant: TenantContext, input: SmsConfigInput) {
    const provider = String(input.provider || "emalify").trim().toLowerCase();
    if (provider !== "emalify") {
      throw new BadRequestException("Only Emalify SMS is currently supported");
    }

    const existing = await this.prisma.organizationSmsConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });

    const data: any = {
      provider,
      isActive: input.isActive !== false,
    };
    if (input.senderId !== undefined) {
      data.senderId = String(input.senderId || "").trim() || null;
    }
    if (input.partnerId) data.partnerIdEncrypted = this.encrypt(input.partnerId);
    if (input.apiKey) data.apiKeyEncrypted = this.encrypt(input.apiKey);

    const saved = existing
      ? await this.prisma.organizationSmsConfig.update({
          where: { organizationId: tenant.organizationId },
          data,
        })
      : await this.prisma.organizationSmsConfig.create({
          data: {
            ...data,
            organizationId: tenant.organizationId,
          },
        });

    return {
      configured: true,
      provider: saved.provider,
      senderId: saved.senderId,
      isActive: saved.isActive,
      hasPartnerId: Boolean(saved.partnerIdEncrypted),
      hasApiKey: Boolean(saved.apiKeyEncrypted),
      usesEnvironmentFallback: false,
      lastBalanceCheckAt: saved.lastBalanceCheckAt,
      lastSentAt: saved.lastSentAt,
    };
  }

  async getBalance(tenant: TenantContext) {
    const config = await this.resolveConfig(tenant);

    const balanceUrl = new URL(
      "https://api.v2.emalify.com/api/services/getbalance/",
    );
    balanceUrl.searchParams.set("apikey", config.apiKey);
    balanceUrl.searchParams.set("partnerID", config.partnerId);

    const response = await this.fetchEmalify(balanceUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    const payload = this.parseProviderPayload(raw);

    if (!response.ok) {
      throw new BadGatewayException(
        payload?.message ||
          payload?.error ||
          payload?.["response-description"] ||
          `Emalify balance request returned ${response.status}`,
      );
    }

    if (config.source === "organization") {
      await this.prisma.organizationSmsConfig.update({
        where: { organizationId: tenant.organizationId },
        data: { lastBalanceCheckAt: new Date() },
      });
    }

    return {
      provider: "emalify",
      balance: this.extractBalance(payload, raw),
      source: config.source,
      response: payload ?? raw,
    };
  }

  async sendBulk(tenant: TenantContext, input: SendSmsInput) {
    const recipients = this.resolveRecipients(input);

    if (recipients.length === 0) {
      throw new BadRequestException("At least one valid phone number is required");
    }

    const config = await this.resolveConfig(tenant);
    const smsUrl = "https://api.v2.emalify.com/api/services/sendbulk/";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    console.log("Messaging config", {
      organizationId: tenant.organizationId,
      source: config.source,
      EMALIFY_PARTNER_ID: this.maskSecret(config.partnerId),
      EMALIFY_API_KEY: this.maskSecret(config.apiKey),
      EMALIFY_SENDER_ID: config.senderId,
      resolvedUrl: smsUrl,
      recipientCount: recipients.length,
    });

    const response = await this.fetchEmalify(smsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        count: recipients.length,
        smslist: recipients.map((recipient, index) => ({
          partnerID: config.partnerId,
          apikey: config.apiKey,
          pass_type: "plain",
          clientsmsid: Date.now() + index,
          mobile: recipient.phoneNumber,
          message: recipient.message,
          shortcode: config.senderId,
        })),
      }),
    });

    const raw = await response.text();
    const payload = this.parseProviderPayload(raw);
    if (!response.ok) {
      throw new BadGatewayException(
        payload?.message ||
          payload?.error ||
          payload?.["response-description"] ||
          `Emalify returned ${response.status}`,
      );
    }

    if (config.source === "organization") {
      await this.prisma.organizationSmsConfig.update({
        where: { organizationId: tenant.organizationId },
        data: { lastSentAt: new Date() },
      });
    }

    return {
      success: true,
      sent: recipients.length,
      provider: "emalify",
      source: config.source,
      response: payload ?? raw,
    };
  }

  private async fetchEmalify(input: string | URL, init: RequestInit) {
    try {
      return await fetch(input, init);
    } catch (error) {
      console.error("Emalify request failed", error);
      throw new BadGatewayException(
        "Could not reach Emalify. Check your internet connection and SMS provider settings.",
      );
    }
  }

  private async resolveConfig(tenant: TenantContext): Promise<ResolvedSmsConfig> {
    const config = await this.prisma.organizationSmsConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    if (config) {
      if (!config.isActive) {
        throw new BadRequestException("SMS account is disabled for this organization");
      }
      if (config.provider !== "emalify") {
        throw new BadRequestException("Unsupported SMS provider");
      }
      if (!config.partnerIdEncrypted || !config.apiKeyEncrypted) {
        throw new BadRequestException("SMS partner ID and API key are required");
      }
      return {
        provider: "emalify",
        partnerId: this.decrypt(config.partnerIdEncrypted),
        apiKey: this.decrypt(config.apiKeyEncrypted),
        senderId: config.senderId || process.env.EMALIFY_SENDER_ID || "makazitech",
        source: "organization",
      };
    }

    const partnerId = process.env.EMALIFY_PARTNER_ID || "";
    const apiKey = process.env.EMALIFY_API_KEY || "";
    if (!partnerId || !apiKey) {
      throw new BadRequestException(
        "SMS is not configured for this organization",
      );
    }
    return {
      provider: "emalify",
      partnerId,
      apiKey,
      senderId: process.env.EMALIFY_SENDER_ID || "makazitech",
      source: "environment",
    };
  }

  private hasEnvironmentFallback() {
    return Boolean(process.env.EMALIFY_PARTNER_ID && process.env.EMALIFY_API_KEY);
  }

  private resolveRecipients(input: SendSmsInput): SmsRecipient[] {
    if (Array.isArray(input.messages) && input.messages.length > 0) {
      return this.uniqueRecipients(
        input.messages
          .map((entry) => ({
            phoneNumber: this.normalizeKenyanPhone(entry.phoneNumber),
            message: entry.message?.trim() || "",
          }))
          .filter((entry) => entry.phoneNumber && entry.message),
      );
    }

    const message = input.message?.trim();
    if (!message) throw new BadRequestException("Message is required");

    return this.uniqueRecipients(
      (input.phoneNumbers || [])
        .map((phone) => ({
          phoneNumber: this.normalizeKenyanPhone(phone),
          message,
        }))
        .filter((entry) => entry.phoneNumber),
    );
  }

  private uniqueRecipients(recipients: SmsRecipient[]) {
    const seen = new Set<string>();
    return recipients.filter((recipient) => {
      if (seen.has(recipient.phoneNumber)) return false;
      seen.add(recipient.phoneNumber);
      return true;
    });
  }

  private normalizeKenyanPhone(phone: string | null | undefined) {
    if (!phone) return "";
    const compact = String(phone).replace(/[^\d+]/g, "");
    if (compact.startsWith("+254")) return `0${compact.slice(4)}`;
    if (compact.startsWith("254")) return `0${compact.slice(3)}`;
    if (compact.startsWith("07") || compact.startsWith("01")) {
      return compact;
    }
    if (compact.startsWith("7") || compact.startsWith("1")) {
      return `0${compact}`;
    }
    return compact.replace(/^\+/, "");
  }

  private maskSecret(value: string | undefined) {
    if (!value) return "not configured";
    if (value.length <= 8) return "configured";
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private parseProviderPayload(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private extractBalance(payload: any, raw: string) {
    const value =
      payload?.balance ??
      payload?.Balance ??
      payload?.credit ??
      payload?.credits ??
      payload?.smsBalance ??
      payload?.["sms-balance"];

    if (value !== undefined && value !== null && value !== "") {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }

    const numericRaw = Number(String(raw || "").trim());
    return Number.isFinite(numericRaw) ? numericRaw : null;
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const key = this.configKey();
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  private decrypt(value: string) {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      throw new BadRequestException("Stored SMS credentials are invalid");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.configKey(),
      Buffer.from(ivRaw, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private configKey() {
    const secret =
      process.env.SMS_CONFIG_SECRET ||
      process.env.MPESA_CONFIG_SECRET ||
      process.env.AUTH_SECRET ||
      "";
    const isDev = (process.env.NODE_ENV || "development") === "development";
    if (!secret) {
      if (isDev) return createHash("sha256").update("dev-sms-config-secret").digest();
      throw new Error("SMS_CONFIG_SECRET is required outside development");
    }
    if (!isDev && secret.length < SMS_CONFIG_SECRET_MIN_LENGTH) {
      throw new Error(
        `SMS_CONFIG_SECRET must be at least ${SMS_CONFIG_SECRET_MIN_LENGTH} characters outside development`,
      );
    }
    return createHash("sha256").update(secret).digest();
  }
}
