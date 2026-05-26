import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "makazicloud_session";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_SECRET_LENGTH = 32;

export type AuthPayload = {
  userId: string;
  organizationId: string;
  exp: number;
};


const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  const isDev = (process.env.NODE_ENV || "development") === "development";

  if (!secret) {
    if (isDev) return "dev-auth-secret";
    throw new Error(
      "AUTH_SECRET is required outside development. Set it to at least 32 random bytes.",
    );
  }

  if (!isDev && secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters outside development.`,
    );
  }

  return secret;
};

export function signSessionToken(payload: AuthPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token?: string): AuthPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as AuthPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readSessionToken(cookieHeader?: string) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
}
