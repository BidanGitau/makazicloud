import { BadRequestException } from "@nestjs/common";

// Server-side password policy. Mirrored on the client by the zod schemas in
// `/accept-tenant-invite/page.js` and `/(auth)/reset-password`. Every code
// path that hashes a new password — signup, accept-invite, change-password,
// reset — must run through assertPasswordPolicy() so a request that
// bypasses the form can't set a weaker password than the UI allows.
const RULES: Array<{ test: RegExp; message: string }> = [
  { test: /.{8,}/, message: "Password must be at least 8 characters" },
  { test: /[A-Z]/, message: "Password must include an uppercase letter" },
  { test: /[a-z]/, message: "Password must include a lowercase letter" },
  { test: /[0-9]/, message: "Password must include a number" },
];

export function assertPasswordPolicy(password: string | undefined): void {
  const value = password || "";
  for (const rule of RULES) {
    if (!rule.test.test(value)) {
      throw new BadRequestException(rule.message);
    }
  }
}
