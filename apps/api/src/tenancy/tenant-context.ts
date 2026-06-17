export type TenantContext = {
  organizationId: string;
  organizationSlug: string;
  membershipId: string;
  userId: string;
  role: string;
  propertyAccessScope: "ALL" | "SELECTED";
  propertyIds: string[];
};
