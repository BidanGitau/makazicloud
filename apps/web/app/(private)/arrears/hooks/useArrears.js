"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrearDetails } from "@/app/_lib/repositories";
import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";
import { enrichArrearRows } from "../utils/arrearsData";

const ARREARS_PAGE_SIZE = 1000;

export function useArrears({ canPopulate = false } = {}) {
  const [loading, setLoading] = useState(true);
  const [arrearsData, setArrearsData] = useState([]);

  const populateArrears = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/arrears/populate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to populate arrears.");
      }
    } catch (err) {
      console.error("Failed to populate arrears:", err);
    }
  }, []);

  const fetchArrears = useCallback(async () => {
    setLoading(true);
    try {
      const rows = [];
      for (let offset = 0; ; offset += ARREARS_PAGE_SIZE) {
        const page = await ArrearDetails.getAll({
          order: { column: "month", ascending: true },
          limit: ARREARS_PAGE_SIZE,
          offset,
        });
        rows.push(...page);
        if (page.length < ARREARS_PAGE_SIZE) break;
      }
      setArrearsData(enrichArrearRows(rows));
    } catch (err) {
      console.error("Failed to fetch arrears:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshArrears = useCallback(async () => {
    if (canPopulate) {
      await populateArrears();
    }
    await fetchArrears();
  }, [canPopulate, fetchArrears, populateArrears]);

  useEffect(() => {
    refreshArrears().catch(console.error);
  }, [refreshArrears]);

  return {
    loading,
    arrearsData,
    fetchArrears,
    populateArrears,
    refreshArrears,
  };
}
