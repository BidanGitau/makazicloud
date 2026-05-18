/**
 * ============================
 * Repository Index
 * Re-exports all repositories from their new locations in app/api
 * ============================
 */

// Core (users, roles, permissions)
export { Users, Roles, Permissions } from "../../api/core/core";

// Properties & Structure
export {
  Properties,
  Blocks,
  Units,
  UserProperties,
} from "../../api/properties/properties";

// Tenants
export {
  TenantOverview,
  Tenants,
  TenantDetails,
  TenantReports,
} from "../../api/tenants/tenants";

// Payments & Allocations
export { Payments, PaymentAllocations } from "../../api/payments/payments";

// Arrears
export { Arrears, ArrearDetails } from "../../api/arrears/arrears";

// Maintenance
export { Maintenance, OwnerAdvances, PropertyNetIncome } from "../../api/maintenance/maintenance";

// Utilities (assignments, meter readings, bills)
export {
  UtilityUnitAssignments,
  UtilityMeterReadings,
  UtilityBills,
} from "../../api/utilities/utilities";

// Reports & Statements
export {
  PropertyStatement,
  PropertyStatementTenants,
} from "../../api/reports/reports";

// Refunds
export { Refunds } from "../../api/refunds/refunds";

// Dashboard
export {
  Dashboard,
  DashboardOverview,
  V_TotalCollection,
  V_Occupancy,
  V_MonthlyCollection,
  V_PropertyEarnings,
  V_TenantStatus,
  V_CustomersInArrears,
} from "../../api/dashboard/dashboard";
