import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Single source of truth for the password storage format. Every code path
// that hashes or verifies a password must go through these helpers — two
// copies of `scrypt(password, salt, 64)` would silently drift if anyone
// changed the key length or salt size in one place.
//
// Stored format: `<saltHex>:<hashHex>` where salt is 16 bytes and hash is
// 64 bytes (scrypt N/r/p defaults). Changing any of those constants is a
// breaking change for existing rows.

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
  // Length guard before timingSafeEqual — it throws on mismatched lengths
  // (which itself would be a side channel).
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
