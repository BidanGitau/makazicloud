


export const ACCOUNT_TYPE = {
  STAFF: "staff",
  TENANT: "tenant",
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];
