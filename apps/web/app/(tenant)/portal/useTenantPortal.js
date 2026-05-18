"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";

// Single round-trip to /tenant-portal/dashboard — replaces the old four
// parallel requests. The portal page only needs `portal`, `outstanding`,
// `refresh`.
export function useTenantPortal(user) {
  const [portal, setPortal] = useState({
    profile: null,
    payments: [],
    arrears: [],
    maintenance: [],
    loading: true,
  });

  const loadPortal = useCallback(async () => {
    if (!user || user.accountType !== ACCOUNT_TYPE.TENANT) return;
    setPortal((prev) => ({ ...prev, loading: true }));
    try {
      const data = await apiFetch("/tenant-portal/dashboard");
      setPortal({
        profile: data.profile,
        payments: data.payments || [],
        arrears: data.arrears || [],
        maintenance: data.maintenance || [],
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load tenant portal:", error);
      showToast.error(error.message || "Failed to load tenant portal");
      setPortal((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const outstanding = useMemo(
    () =>
      portal.arrears.reduce((sum, row) => {
        const balance = Number(row.balance || 0);
        return balance > 0 ? sum + balance : sum;
      }, 0),
    [portal.arrears],
  );

  return { portal, outstanding, refresh: loadPortal };
}
