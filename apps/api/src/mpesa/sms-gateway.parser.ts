import { createHash } from "node:crypto";

export type ParsedSmsPayment = {
  shortcode: string;
  billRefNumber: string;
  accountPrefix: string;
  unitNumber: string;
  normalizedAccount: string;
  transId: string;
  amount: number;
  phoneNumber: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  transTime: Date | null;
  rawSms: string;
};

const AMOUNT_RE = /ksh[\s.]*([\d,]+(?:\.\d{1,2})?)/i;
const RECEIPT_RE = /\b([A-Z0-9]{8,12})\s+confirmed\b/i;
const PHONE_RE = /\b(254\d{9}|07\d{8}|01\d{8})\b/;
const ACCOUNT_RE =
  /(?:account(?:\s+number)?|acc(?:ount)?(?:\s+no\.?)?|for account)\s*[:.]?\s*([A-Z0-9#/_-]+)/i;
const HASH_ACCOUNT_RE = /\b([A-Z0-9]{2,20}#[A-Z0-9]{1,12})\b/i;
const SHORTCODE_RE =
  /(?:paybill|till(?:\s+number)?|business\s+number|shortcode)\s*[:.]?\s*(\d{5,8})/i;
const RECEIVED_FROM_RE = /received from\s+([A-Z][A-Z\s'.-]{1,60}?)\s+(\d{9,12})/i;
const DATE_RE =
  /\bon\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(?:at\s+)?(\d{1,2}:\d{2}(?:\s*[ap]m)?)/i;

export function extractInboundSms(body: unknown): { from: string; text: string } {
  if (typeof body === "string") {
    return { from: "MPESA", text: body.trim() };
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested =
    payload.message && typeof payload.message === "object"
      ? (payload.message as Record<string, unknown>)
      : payload;
  const text = String(
    nested.text ||
      nested.sms ||
      nested.body ||
      nested.message ||
      payload.text ||
      payload.sms ||
      payload.body ||
      payload.msg ||
      "",
  ).trim();
  const from = String(
    nested.from || nested.sender || nested.address || payload.from || payload.sender || "MPESA",
  ).trim();
  return { from, text };
}

export function parseSafaricomConfirmationSms(
  text: string,
  fallbackShortcode = "",
): ParsedSmsPayment | null {
  const rawSms = String(text || "").replace(/\s+/g, " ").trim();
  if (!rawSms) return null;

  const amountMatch = rawSms.match(AMOUNT_RE);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
  if (!amount || amount <= 0) return null;

  const receiptMatch = rawSms.match(RECEIPT_RE);
  const transId = receiptMatch
    ? receiptMatch[1].toUpperCase()
    : `SMS-${createHash("sha256").update(rawSms).digest("hex").slice(0, 10).toUpperCase()}`;

  const accountRaw =
    rawSms.match(ACCOUNT_RE)?.[1] || rawSms.match(HASH_ACCOUNT_RE)?.[1] || "";
  const account = parseAccountRef(accountRaw);
  const received = rawSms.match(RECEIVED_FROM_RE);
  const phoneNumber = received?.[2] || rawSms.match(PHONE_RE)?.[1] || null;
  const names = splitPayerName(received?.[1] || "");
  const shortcode = rawSms.match(SHORTCODE_RE)?.[1] || fallbackShortcode || "sms";

  return {
    shortcode,
    billRefNumber: account.billRefNumber,
    accountPrefix: account.prefix,
    unitNumber: account.unitNumber,
    normalizedAccount: account.unitNumber,
    transId,
    amount,
    phoneNumber,
    firstName: names.firstName,
    middleName: names.middleName,
    lastName: names.lastName,
    transTime: parseSmsDate(rawSms),
    rawSms,
  };
}

export function parseAccountRef(value: string) {
  const billRefNumber = String(value || "").trim();
  const hashIndex = billRefNumber.indexOf("#");
  if (hashIndex >= 0) {
    const prefix = billRefNumber.slice(0, hashIndex).replace(/\s+/g, "");
    const unitNumber = billRefNumber
      .slice(hashIndex + 1)
      .replace(/\s+/g, "")
      .toLowerCase();
    return { billRefNumber, prefix, unitNumber };
  }
  const unitNumber = billRefNumber.replace(/\s+/g, "").toLowerCase();
  return { billRefNumber, prefix: "", unitNumber };
}

function splitPayerName(value: string) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || null,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
    lastName: parts.length > 1 ? parts[parts.length - 1] : null,
  };
}

function parseSmsDate(rawSms: string) {
  const match = rawSms.match(DATE_RE);
  if (!match) return null;
  const [day, month, yearRaw] = match[1].split(/[/-]/).map((part) => Number(part));
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const time = match[2].trim();
  const ampm = time.match(/[ap]m$/i)?.[0]?.toLowerCase();
  const [hourRaw, minute] = time.replace(/\s*[ap]m$/i, "").split(":").map((part) => Number(part));
  let hour = hourRaw;
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const date = new Date(year, month - 1, day, hour, minute || 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}
