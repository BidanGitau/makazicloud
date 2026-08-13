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
  clientId?: string | number;
  partnerId?: string;
  apiKey?: string;
  token?: string;
  senderId?: string;
  isActive?: boolean;
};

type ResolvedSmsConfig = {
  provider: "techchrast";
  clientId: number;
  apiKey: string;
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
        provider: "techchrast",
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
    const provider = String(input.provider || "techchrast").trim().toLowerCase();
    if (provider !== "techchrast") {
      throw new BadRequestException("Only Techchrast SMS is currently supported");
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
    const clientId = input.clientId ?? input.partnerId;
    const apiKey = input.token || input.apiKey;
    if (clientId !== undefined && clientId !== null && String(clientId).trim()) {
      data.partnerIdEncrypted = this.encrypt(String(clientId).trim());
    }
    if (apiKey) data.apiKeyEncrypted = this.encrypt(apiKey);

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
    const lastSend = this.getLastTechchrastSend();
    const availableUnits = lastSend
      ? this.extractTechchrastAvailableUnits(lastSend.response)
      : null;

    if (config.source === "organization") {
      await this.prisma.organizationSmsConfig.update({
        where: { organizationId: tenant.organizationId },
        data: { lastBalanceCheckAt: new Date() },
      });
    }

    return {
      provider: "techchrast",
      balance: availableUnits,
      source: config.source,
      lastSentAt: lastSend?.sentAt ?? null,
      response: lastSend?.response ?? {
        message:
          "Techchrast SMS balance updates after a send response. Send an SMS or check again after the next message.",
      },
    };
  }

  async sendBulk(tenant: TenantContext, input: SendSmsInput) {
    const recipients = this.resolveRecipients(input);

    if (recipients.length === 0) {
      throw new BadRequestException("At least one valid phone number is required");
    }

    const config = await this.resolveConfig(tenant);
    const smsUrl =
      process.env.TECHCHRAST_SMS_URL ||
      "https://techchrast-sms.onrender.com/api/messages/sms/send";

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };

    console.log("Messaging config", {
      organizationId: tenant.organizationId,
      provider: config.provider,
      source: config.source,
      TECHCHRAST_CLIENT_ID: config.clientId,
      TECHCHRAST_SMS_TOKEN: this.maskSecret(config.apiKey),
      resolvedUrl: smsUrl,
      recipientCount: recipients.length,
    });

    const responses = await Promise.all(
      recipients.map(async (recipient) => {
        const response = await this.fetchTechchrast(smsUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientId: config.clientId,
            phoneNumber: recipient.phoneNumber,
            message: recipient.message,
          }),
        });

        const raw = await response.text();
        const payload = this.parseProviderPayload(raw);
        if (!response.ok) {
          throw new BadGatewayException(
            payload?.message ||
              payload?.error ||
              payload?.title ||
              `Techchrast SMS returned ${response.status}`,
          );
        }
        return payload ?? raw;
      }),
    );

    if (config.source === "organization") {
      await this.prisma.organizationSmsConfig.update({
        where: { organizationId: tenant.organizationId },
        data: { lastSentAt: new Date() },
      });
    }

    this.setLastTechchrastSend(responses);

    return {
      success: true,
      sent: recipients.length,
      provider: "techchrast",
      source: config.source,
      balance: this.extractTechchrastAvailableUnits(responses),
      response: responses,
    };
  }

  private async fetchTechchrast(input: string | URL, init: RequestInit) {
    try {
      return await fetch(input, init);
    } catch (error) {
      console.error("Techchrast SMS request failed", error);
      throw new BadGatewayException(
        "Could not reach Techchrast SMS. Check your internet connection and SMS provider settings.",
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
      if (config.provider !== "techchrast") {
        return this.resolveEnvironmentConfig();
      }
      if (!config.partnerIdEncrypted || !config.apiKeyEncrypted) {
        throw new BadRequestException("SMS client ID and API token are required");
      }
      const clientId = Number(this.decrypt(config.partnerIdEncrypted));
      if (!Number.isInteger(clientId) || clientId <= 0) {
        throw new BadRequestException("Stored SMS client ID is invalid");
      }
      return {
        provider: "techchrast",
        clientId,
        apiKey: this.decrypt(config.apiKeyEncrypted),
        source: "organization",
      };
    }

    return this.resolveEnvironmentConfig();
  }

  private resolveEnvironmentConfig(): ResolvedSmsConfig {
    const clientId = Number(process.env.TECHCHRAST_SMS_CLIENT_ID || "");
    const apiKey = process.env.TECHCHRAST_SMS_TOKEN || "";
    if (!Number.isInteger(clientId) || clientId <= 0 || !apiKey) {
      throw new BadRequestException("SMS is not configured for this organization");
    }
    return {
      provider: "techchrast",
      clientId,
      apiKey,
      source: "environment",
    };
  }

  private hasEnvironmentFallback() {
    const clientId = Number(process.env.TECHCHRAST_SMS_CLIENT_ID || "");
    return Boolean(Number.isInteger(clientId) && clientId > 0 && process.env.TECHCHRAST_SMS_TOKEN);
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
    if (compact.startsWith("+254")) return compact.slice(1);
    if (compact.startsWith("254")) return compact;
    if (compact.startsWith("07") || compact.startsWith("01")) {
      return `254${compact.slice(1)}`;
    }
    if (compact.startsWith("7") || compact.startsWith("1")) {
      return `254${compact}`;
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

  private getLastTechchrastSend() {
    return (globalThis as any).__makaziTechchrastLastSend as
      | { sentAt: string; response: unknown }
      | undefined;
  }

  private setLastTechchrastSend(response: unknown) {
    (globalThis as any).__makaziTechchrastLastSend = {
      sentAt: new Date().toISOString(),
      response,
    };
  }

  private extractTechchrastAvailableUnits(response: unknown): number | null {
    const entries = Array.isArray(response) ? response : [response];
    for (const entry of entries) {
      const payload = entry as any;
      const before = Number(payload?.availableSmsUnitsBeforeSend);
      const queued = Number(payload?.smsUnitsQueued);
      const value =
        payload?.availableSmsUnitsAfterSend ??
        (Number.isFinite(before) && Number.isFinite(queued)
          ? before - queued
          : payload?.availableSmsUnitsBeforeSend);
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return null;
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
