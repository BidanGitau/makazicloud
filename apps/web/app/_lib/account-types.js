


export const ACCOUNT_TYPE = Object.freeze({
  STAFF: "staff",
  TENANT: "tenant",
});

export const isTenantAccount = (user) =>
  user?.accountType === ACCOUNT_TYPE.TENANT;
