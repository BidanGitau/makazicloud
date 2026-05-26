import { createCRUD } from "../../_lib/crud";
import { apiFetch } from "../../_lib/api/client";


export const DashboardOverview = createCRUD("dashboard_overview", {
  defaultSelect:
    "property_id, property_name, total_units, active_tenants, occupied_units, occupancy_rate, total_collected, total_outstanding, collection_rate",
  readOnly: true,
});


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
