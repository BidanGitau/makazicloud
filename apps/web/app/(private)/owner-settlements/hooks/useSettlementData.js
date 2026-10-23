"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "@/app/_components/CustomToast";
import {
  Maintenance,
  OwnerAdvances,
  OwnerSettlements,
  PropertyNetIncome,
  TenantOverview,
} from "@/app/_lib/repositories";

/** Loads everything the owner settlements page shows for a date range. */
export function useSettlementData({ range, includeDeposits }) {
  const [netRows, setNetRows] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const match = {
        start_date: range.startDate,
        end_date: range.endDate,
        include_deposits: includeDeposits ? "true" : "false",
      };
      const [net, ownerAdvances, maintenanceRows, closeRows, tenantRows] = await Promise.all([
        PropertyNetIncome.getAll({ match }),
        OwnerAdvances.getWithDetails({}),
        Maintenance.getWithDetails({}),
        OwnerSettlements.getAll({
          order: { column: "close_month", ascending: false },
        }),
        TenantOverview.getAllPages({
          order: { column: "full_name", ascending: true },
        }),
      ]);
      setNetRows(net || []);
      setAdvances(ownerAdvances || []);
      setMaintenance(maintenanceRows || []);
      setSettlements(closeRows || []);
      setTenants(tenantRows || []);
    } catch (err) {
      console.error(err);
      showToast.error("Failed to load owner disbursement data.");
    } finally {
      setLoading(false);
    }
  }, [includeDeposits, range.endDate, range.startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { netRows, advances, tenants, maintenance, settlements, loading, loadData };
}
