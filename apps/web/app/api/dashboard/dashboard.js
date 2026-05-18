import { createCRUD } from "../../_lib/crud";
import { apiFetch } from "../../_lib/api/client";

/**
 * ============================
 * Dashboard Overview
 * ============================
 */
export const DashboardOverview = createCRUD("dashboard_overview", {
  defaultSelect:
    "property_id, property_name, total_units, active_tenants, occupied_units, occupancy_rate, total_collected, total_outstanding, collection_rate",
  readOnly: true,
});

/**
 * Bundled dashboard payload — one round-trip replaces the old waterfall
 * of (DashboardOverview + Properties + Payments + Arrears + Tenants + Units).
 *
 * Returns:
 *   { overview: [...], properties: [{id,name}], available_years: number[],
 *     monthly_aggregates: [{ property_id, year, month, collected, outstanding }] }
 *
 * Uses apiFetch directly (not createCRUD) because the bundle is a single
 * object, not a list — createCRUD's normalizeRows would wrap it.
 */
export const Dashboard = {
  async getBundle(query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
    const qs = params.toString() ? `?${params}` : "";
    return apiFetch(`/data/dashboard_bundle${qs}`);
  },
};

/**
 * ============================
 * Dashboard Views
 * ============================
 */
export const V_TotalCollection = createCRUD("dashboard_total_collection", {
  defaultSelect: "total_collection,collection_rate",
  readOnly: true,
});

export const V_Occupancy = createCRUD("dashboard_occupancy", {
  defaultSelect: "occupancy_rate",
  readOnly: true,
});

export const V_MonthlyCollection = createCRUD("dashboard_monthly_collection", {
  defaultSelect: "month,total_collected",
  readOnly: true,
});

export const V_PropertyEarnings = createCRUD("dashboard_property_earnings", {
  defaultSelect: "property_name,total_collected",
  readOnly: true,
});

export const V_TenantStatus = createCRUD("dashboard_tenant_status", {
  defaultSelect: "current,overdue,vacant",
  readOnly: true,
});

export const V_CustomersInArrears = createCRUD("dashboard_customers_arrears", {
  defaultSelect:
    "profile_id,tenant_name,unit_number,property_name,outstanding,days_overdue",
  readOnly: true,
});
