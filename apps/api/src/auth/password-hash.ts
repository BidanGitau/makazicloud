import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";


const SALT_BYTES = 16;
const KEY_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_BYTES).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, KEY_BYTES);
  const expected = Buffer.from(hash, "hex");


  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
