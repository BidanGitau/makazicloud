import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

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

@Injectable()
export class SmsService {
  async getBalance() {
    const partnerId = process.env.EMALIFY_PARTNER_ID || "";
    const apiKey = process.env.EMALIFY_API_KEY || "";
    if (!partnerId || !apiKey) {
      throw new BadRequestException(
        "EMALIFY_PARTNER_ID and EMALIFY_API_KEY are not configured",
      );
    }

    const balanceUrl = new URL(
      "https://api.v2.emalify.com/api/services/getbalance/",
    );
    balanceUrl.searchParams.set("apikey", apiKey);
    balanceUrl.searchParams.set("partnerID", partnerId);

    const response = await fetch(balanceUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    const payload = this.parseProviderPayload(raw);

    if (!response.ok) {
      throw new InternalServerErrorException(
        payload?.message ||
          payload?.error ||
          payload?.["response-description"] ||
          `Emalify balance request returned ${response.status}`,
      );
    }

    return {
      provider: "emalify",
      balance: this.extractBalance(payload, raw),
      response: payload ?? raw,
    };
  }

  async sendBulk(input: SendSmsInput) {
    const recipients = this.resolveRecipients(input);

    if (recipients.length === 0) {
      throw new BadRequestException("At least one valid phone number is required");
    }

    const partnerId = process.env.EMALIFY_PARTNER_ID || "";
    const apiKey = process.env.EMALIFY_API_KEY || "";
    if (!partnerId || !apiKey) {
      throw new BadRequestException(
        "EMALIFY_PARTNER_ID and EMALIFY_API_KEY are not configured",
      );
    }

    const from = process.env.EMALIFY_SENDER_ID || "makazitech";
    const smsUrl = "https://api.v2.emalify.com/api/services/sendbulk/";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    console.log("Messaging env config", {
      EMALIFY_PARTNER_ID: this.maskSecret(partnerId),
      EMALIFY_API_KEY: this.maskSecret(apiKey),
      EMALIFY_SENDER_ID: from,
      resolvedUrl: smsUrl,
      recipientCount: recipients.length,
    });

    const response = await fetch(smsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        count: recipients.length,
        smslist: recipients.map((recipient, index) => ({
          partnerID: partnerId,
          apikey: apiKey,
          pass_type: "plain",
          clientsmsid: Date.now() + index,
          mobile: recipient.phoneNumber,
          message: recipient.message,
          shortcode: from,
        })),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new InternalServerErrorException(
        payload?.message ||
          payload?.error ||
          payload?.["response-description"] ||
          `Emalify returned ${response.status}`,
      );
    }

    return {
      success: true,
      sent: recipients.length,
      provider: "emalify",
      response: payload,
    };
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
}
