export const TABLE_TO_MODEL: Record<string, string> = {
  properties: "property",
  blocks: "block",
  units: "unit",
  tenants: "tenant",
  payments: "payment",
  payment_allocations: "paymentAllocation",
  arrears: "arrear",
  maintenance_requests: "maintenanceRequest",
  owner_advances: "ownerAdvance",
  owner_settlements: "ownerSettlement",
  utility_unit_assignments: "utilityUnitAssignment",
  utility_meter_readings: "utilityMeterReading",
  utility_bills: "utilityBill",
  refunds: "refund",
};

export const PROTECTED_WRITE_FIELDS = new Set([
  "id",
  "organizationId",
  "createdAt",
  "updatedAt",
]);

export const PROTECTED_QUERY_KEYS = new Set(["organizationId"]);
export const DEFAULT_LIST_LIMIT = 500;
export const MAX_LIST_LIMIT = 1000;

const dashboardCacheTtl = Number(process.env.API_DASHBOARD_CACHE_TTL_MS);
export const DASHBOARD_CACHE_TTL_MS =
  Number.isFinite(dashboardCacheTtl) && dashboardCacheTtl >= 0
    ? dashboardCacheTtl
    : 30_000;

const privateDataCacheTtl = Number(process.env.API_PRIVATE_DATA_CACHE_TTL_MS);
export const PRIVATE_DATA_CACHE_TTL_MS =
  Number.isFinite(privateDataCacheTtl) && privateDataCacheTtl >= 0
    ? privateDataCacheTtl
    : 15_000;

export const READ_ONLY_ALIASES: Record<string, string> = {
  v_tenant_overview: "tenant",
  tenant_details: "tenant",
  v_arrears_with_details: "arrear",
  dashboard_total_collection: "payment",
  dashboard_occupancy: "unit",
  dashboard_monthly_collection: "payment",
  dashboard_property_earnings: "payment",
  dashboard_tenant_status: "tenant",
  dashboard_customers_arrears: "arrear",
  v_property_statement: "payment",
  v_property_statement_tenants: "tenant",
  v_property_statement_summary: "payment",
  v_tenant_payment_overview: "payment",
  v_utility_bills_with_details: "utilityBill",
  v_maintenance_requests_with_details: "maintenanceRequest",
  v_owner_advances_with_details: "ownerAdvance",
};
