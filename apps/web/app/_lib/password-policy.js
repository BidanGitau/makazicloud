import { z } from "zod";

// Mirror of apps/api/src/auth/password-policy.ts — the server is the source
// of truth, this is the client-side echo. Keep these two in sync; the
// server will reject anything that slips through.
export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "One uppercase letter")
  .regex(/[a-z]/, "One lowercase letter")
  .regex(/[0-9]/, "One number");
