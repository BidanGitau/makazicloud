// Mirror of apps/api/src/auth/account-types.ts. Keep these two files in sync.
// Importing the same constant in both web and api isn't possible across the
// language boundary, so the values must match by convention.
export const ACCOUNT_TYPE = Object.freeze({
  STAFF: "staff",
  TENANT: "tenant",
});

export const isTenantAccount = (user) =>
  user?.accountType === ACCOUNT_TYPE.TENANT;
