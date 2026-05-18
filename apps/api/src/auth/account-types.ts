// Shared union for the two kinds of accounts that hold sessions.
// Use these constants rather than the raw "staff" / "tenant" strings so
// the next typo can't silently route a user to the wrong app.
export const ACCOUNT_TYPE = {
  STAFF: "staff",
  TENANT: "tenant",
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];
