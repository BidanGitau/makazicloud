"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardOverview, PropertyNetIncome } from "@/app/_lib/repositories";
import {
  buildFinancialExportData,
  filterFinancialRows,
  mapNetIncomeByProperty,
  summarizeFinancialRows,
} from "../utils/financialReportUtils";

const emptyFilters = {
  propertyId: "",
  blockId: "",
  startDate: "",
  endDate: "",
  occupancyFilter: "active",
  search: "",
};

export function useFinancialReport() {
  const [data, setData] = useState([]);
  const [netIncome, setNetIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);

  const updateFilters = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const match = {
        ...(filters.propertyId ? { property_id: filters.propertyId } : {}),
        ...(filters.blockId ? { block_id: filters.blockId } : {}),
        ...(filters.startDate ? { start_date: filters.startDate } : {}),
        ...(filters.endDate ? { end_date: filters.endDate } : {}),
      };
      const [overviewData, netData] = await Promise.all([
        DashboardOverview.getAll({ match }),
        PropertyNetIncome.getAll({ match }),
      ]);

      setData(overviewData);
      setNetIncome(netData);
    } catch (err) {
      console.error("Error loading financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters.blockId, filters.endDate, filters.propertyId, filters.startDate]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const netByProperty = useMemo(
    () => mapNetIncomeByProperty(netIncome),
    [netIncome],
  );

  const filteredData = useMemo(
    () => filterFinancialRows(data, filters),
    [data, filters],
  );

  const summary = useMemo(
    () => summarizeFinancialRows(filteredData, netIncome),
    [filteredData, netIncome],
  );

  const exportData = useMemo(
    () => buildFinancialExportData(filteredData, summary, netByProperty),
    [filteredData, netByProperty, summary],
  );

  return {
    data,
    loading,
    filters,
    filteredData,
    summary,
    exportData,
    netByProperty,
    loadFinancialData,
    updateFilters,
    resetFilters,
  };
}
