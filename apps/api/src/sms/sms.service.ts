import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

type SendSmsInput = {
  phoneNumbers?: string[];
  message?: string;
};

@Injectable()
export class SmsService {
  async sendBulk(input: SendSmsInput) {
    const message = input.message?.trim();
    if (!message) throw new BadRequestException("Message is required");

    const recipients = [
      ...new Set(
        (input.phoneNumbers || [])
          .map((phone) => this.normalizeKenyanPhone(phone))
          .filter(Boolean),
      ),
    ];

    if (recipients.length === 0) {
      throw new BadRequestException("At least one valid phone number is required");
    }

    const projectId = process.env.EMALIFY_PROJECT_ID;
    if (!projectId) {
      throw new BadRequestException("EMALIFY_PROJECT_ID is not configured");
    }

    const from = process.env.EMALIFY_SENDER_ID || "makazitech";
    const baseUrl = (
      process.env.EMALIFY_API_BASE_URL || "https://api.emalify.com"
    ).replace(/\/+$/, "");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (process.env.EMALIFY_API_KEY) {
      headers.Authorization = `Bearer ${process.env.EMALIFY_API_KEY}`;
    }

    const response = await fetch(
      `${baseUrl}/v1/projects/${encodeURIComponent(projectId)}/sms/bulk`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: recipients.map((recipient) => ({
            recipient,
            message,
            messageId: randomUUID(),
          })),
          from,
        }),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new InternalServerErrorException(
        payload?.message || payload?.error || `Emalify returned ${response.status}`,
      );
    }

    return {
      success: true,
      sent: recipients.length,
      provider: "emalify",
      response: payload,
    };
  }

  private normalizeKenyanPhone(phone: string | null | undefined) {
    if (!phone) return "";
    const compact = String(phone).replace(/[^\d+]/g, "");
    if (compact.startsWith("+254")) return `254${compact.slice(4)}`;
    if (compact.startsWith("254")) return compact;
    if (compact.startsWith("07") || compact.startsWith("01")) {
      return `254${compact.slice(1)}`;
    }
    if (compact.startsWith("7") || compact.startsWith("1")) {
      return `254${compact}`;
    }
    return compact.replace(/^\+/, "");
  }
}
