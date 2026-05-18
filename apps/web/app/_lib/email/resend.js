import { Resend } from "resend";

const DEFAULT_FROM = "MakaziCloud <noreply@contact.makazicloud.com>";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      resend: null,
      error:
        "Missing Resend API key. Set RESEND_API_KEY in your deployment environment.",
    };
  }

  return {
    resend: new Resend(apiKey),
    error: null,
  };
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}
