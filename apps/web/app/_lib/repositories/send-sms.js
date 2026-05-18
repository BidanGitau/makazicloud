const EMALIFY_SMS_URL = "https://api.v2.emalify.com/api/services/sendsms/";
const EMALIFY_BULK_SMS_URL =
  "https://api.v2.emalify.com/api/services/sendbulk/";

function formatKenyanPhoneNumber(phoneNumber) {
  const normalized = String(phoneNumber || "").replace(/[^\d+]/g, "").trim();

  if (normalized.startsWith("+254")) return normalized.slice(1);
  if (normalized.startsWith("254")) return normalized;
  if (normalized.startsWith("0")) return `254${normalized.slice(1)}`;

  return normalized;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function sendSMS({ phoneNumbers, message }) {
  try {
    const apiKey = process.env.EMALIFY_API_KEY;
    const partnerID = process.env.EMALIFY_PARTNER_ID;
    const shortcode = process.env.EMALIFY_SHORTCODE || "Emalify";

    if (!apiKey || !partnerID) {
      throw new Error("Missing Emalify SMS credentials");
    }

    const recipients = (phoneNumbers || [])
      .map(formatKenyanPhoneNumber)
      .filter(Boolean);

    if (recipients.length === 0) {
      throw new Error("No valid phone numbers provided");
    }

    if (recipients.length === 1) {
      const mobile = recipients[0];
      const response = await fetch(EMALIFY_SMS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: apiKey,
          partnerID: String(partnerID),
          mobile,
          message,
          shortcode,
          pass_type: "plain",
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || `Emalify SMS failed for ${mobile}`,
        );
      }

      return {
        success: true,
        data: { mode: "single", results: [{ mobile, data }] },
      };
    }

    const smslist = recipients.map((mobile, index) => ({
      partnerID: String(partnerID),
      apikey: apiKey,
      pass_type: "plain",
      clientsmsid: Date.now() + index,
      mobile,
      message,
      shortcode,
    }));

    const response = await fetch(EMALIFY_BULK_SMS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count: smslist.length,
        smslist,
      }),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Emalify bulk SMS failed");
    }

    return {
      success: true,
      data: {
        mode: "bulk",
        count: smslist.length,
        results: smslist.map(({ mobile, clientsmsid }) => ({
          mobile,
          clientsmsid,
        })),
        response: data,
      },
    };
  } catch (error) {
    console.error("SMS sending failed:", error);
    return { success: false, error: error.message || "Failed to send SMS" };
  }
}
