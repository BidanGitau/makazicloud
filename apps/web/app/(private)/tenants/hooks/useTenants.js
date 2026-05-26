"use client";

import { useState, useCallback } from "react";
import { TenantOverview, Tenants, Units } from "@/app/_lib/repositories";
import { invalidateFormDataCache } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";

const useTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await TenantOverview.getAll({
        order: { column: "full_name", ascending: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const processedTenants = (data || []).map((tenant) => {
        const viewDueDate = tenant.oldest_arrear_due_date
          ? new Date(tenant.oldest_arrear_due_date)
          : null;
        if (viewDueDate) viewDueDate.setHours(0, 0, 0, 0);

        const dueDate = viewDueDate;
        const diffMs = dueDate ? today - dueDate : 0;
        const outstandingDays = diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;

        return {
          ...tenant,
          overdueAmount:
            parseFloat(tenant.arrears_amount || tenant.arrears_balance) || 0,
          rentAmount: parseFloat(tenant.rent_amount) || 0,
          leaseStartDate: new Date(tenant.lease_start),
          outstanding_days: Number(tenant.days_in_arrears ?? outstandingDays),
        };
      });

      setTenants(processedTenants);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
      showToast.error("Failed to load tenants!");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTenant = useCallback(
    async (id) => {
      if (!confirm("Are you sure you want to delete this tenant?")) return;

      try {
        await Tenants.remove(id);
        invalidateFormDataCache();
        showToast.success("Tenant deleted successfully!");
        await fetchTenants();
      } catch (error) {
        console.error("Failed to delete tenant:", error);
        showToast.error("Failed to delete tenant!");
      }
    },
    [fetchTenants],
  );

  const cancelLease = useCallback(
    async (id, tenantName) => {
      if (!confirm(`Cancel lease for ${tenantName}? This will mark the tenant as inactive and free their unit.`)) return;

      try {
        const tenant = tenants.find((row) => (row.tenant_id || row.id) === id);
        const unitId =
          tenant?.unit_id && typeof tenant.unit_id === "object"
            ? tenant.unit_id.id
            : tenant?.unit_id;


        await Tenants.update(
          id,
          { status: "inactive", user_id: null },
          { returning: false },
        );
        if (unitId) await Units.update(unitId, { status: "vacant" });
        invalidateFormDataCache();
        showToast.success("Lease cancelled successfully!");
        await fetchTenants();
      } catch (error) {
        console.error("Failed to cancel lease:", error);
        showToast.error("Failed to cancel lease!");
      }
    },
    [fetchTenants, tenants],
  );

  return { tenants, loading, fetchTenants, deleteTenant, cancelLease };
};

export default useTenants;
