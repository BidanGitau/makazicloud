"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { DashboardOverview, PropertyNetIncome } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import { DollarSign, TrendingUp, Building, Users, Wrench } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import ReportTabs from "../ReportTabs";

const formatPct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

export default function FinancialSummaryPage() {
  const [data, setData] = useState([]);
  const [netIncome, setNetIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("active");
  const [search, setSearch] = useState("");

  const {
    properties,
    propertyBlocks,
    isLoading: isLoadingFormData,
  } = usePropertyStructure(propertyId, blockId);

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const match = {
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(blockId ? { block_id: blockId } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
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
  }, [propertyId, blockId, startDate, endDate]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const netByProperty = useMemo(() => {
    const map = {};
    netIncome.forEach((r) => {
      map[r.property_id] = r;
    });
    return map;
  }, [netIncome]);

  const filteredData = useMemo(() => {
    let rows = data;

    if (occupancyFilter === "active") {
      rows = rows.filter((item) => Number(item.active_tenants || 0) > 0);
    } else if (occupancyFilter === "vacant") {
      rows = rows.filter((item) => Number(item.active_tenants || 0) === 0);
    } else if (occupancyFilter === "with_outstanding") {
      rows = rows.filter((item) => Number(item.total_outstanding || 0) > 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((item) =>
        String(item.property_name || "")
          .toLowerCase()
          .includes(q),
      );
    }

    return rows;
  }, [data, occupancyFilter, search]);

  const summary = useMemo(() => {
    const visiblePropertyIds = new Set(
      filteredData.map((row) => row.property_id),
    );
    const visibleNetRows = netIncome.filter((row) =>
      visiblePropertyIds.has(row.property_id),
    );
    const totalProperties = filteredData.length;
    const totalRevenue = filteredData.reduce(
      (s, i) => s + Number(i.total_collected || 0),
      0,
    );
    const totalTenants = filteredData.reduce(
      (s, i) => s + Number(i.active_tenants || 0),
      0,
    );
    const averageOccupancy =
      filteredData.reduce((s, i) => s + Number(i.occupancy_rate || 0), 0) /
      (totalProperties || 1);
    const totalMaintenance = visibleNetRows.reduce(
      (s, r) => s + Number(r.total_maintenance_cost || 0),
      0,
    );
    const totalAdvances = visibleNetRows.reduce(
      (s, r) => s + Number(r.total_advances || 0),
      0,
    );
    const netIncomeTotal = visibleNetRows.reduce(
      (s, r) => s + Number(r.net_income || 0),
      0,
    );

    return {
      totalRevenue,
      totalMaintenance,
      totalAdvances,
      netIncome: netIncomeTotal,
      totalProperties,
      totalTenants,
      averageOccupancy,
    };
  }, [filteredData, netIncome]);

  const exportData = useMemo(() => {
    const rows = filteredData.map((row) => {
      const net = netByProperty[row.property_id] || {};
      return {
        property: row.property_name || "N/A",
        units: Number(row.total_units || 0),
        tenants: Number(row.active_tenants || 0),
        occupancy: formatPct(row.occupancy_rate),
        collected: Number(row.total_collected || 0),
        outstanding: Number(row.total_outstanding || 0),
        maintenance: Number(net.total_maintenance_cost || 0),
        advances: Number(net.total_advances || 0),
        netIncome: Number(net.net_income || 0),
        collectionRate: formatPct(row.collection_rate),
      };
    });
    if (rows.length > 0) {
      rows.push({
        property: "TOTAL",
        units: filteredData.reduce((s, r) => s + Number(r.total_units || 0), 0),
        tenants: summary.totalTenants,
        occupancy: formatPct(summary.averageOccupancy),
        collected: Number(summary.totalRevenue || 0),
        outstanding: filteredData.reduce(
          (s, r) => s + Number(r.total_outstanding || 0),
          0,
        ),
        maintenance: Number(summary.totalMaintenance || 0),
        advances: Number(summary.totalAdvances || 0),
        netIncome: Number(summary.netIncome || 0),
        collectionRate: "—",
      });
    }
    return rows;
  }, [filteredData, summary, netByProperty]);

  const exportColumns = [
    { header: "Property", key: "property", width: "18%" },
    { header: "Units", key: "units", width: "7%" },
    { header: "Tenants", key: "tenants", width: "8%" },
    { header: "Occupancy", key: "occupancy", width: "9%" },
    {
      header: "Collected (KSh)",
      key: "collected",
      type: "currency",
      width: "12%",
    },
    {
      header: "Outstanding (KSh)",
      key: "outstanding",
      type: "currency",
      width: "12%",
    },
    {
      header: "Maintenance (KSh)",
      key: "maintenance",
      type: "currency",
      width: "12%",
    },
    {
      header: "Advances (KSh)",
      key: "advances",
      type: "currency",
      width: "11%",
    },
    {
      header: "Net Income (KSh)",
      key: "netIncome",
      type: "currency",
      width: "11%",
    },
  ];

  const pdfMetadata = useMemo(
    () => ({
      Generated: new Date().toLocaleDateString("en-KE"),
      Property:
        properties.find((p) => p.id === propertyId)?.name || "All Properties",
      Block: propertyBlocks.find((b) => b.id === blockId)?.name || "All Blocks",
      Period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
      "Total Revenue": formatCurrency(summary.totalRevenue),
      "Maintenance Cost": formatCurrency(summary.totalMaintenance),
      "Owner Advances": formatCurrency(summary.totalAdvances),
      "Net Income": formatCurrency(summary.netIncome),
      Properties: summary.totalProperties,
      "Active Tenants": summary.totalTenants,
      "Avg Occupancy": formatPct(summary.averageOccupancy),
    }),
    [
      summary,
      properties,
      propertyBlocks,
      propertyId,
      blockId,
      startDate,
      endDate,
    ],
  );

  const columns = [
    {
      name: "Property",
      selector: (row) => row.property_name,
      sortable: true,
      grow: 1.4,
    },
    {
      name: "Units",
      selector: (row) => row.total_units,
      sortable: true,
      style: { justifyContent: "flex-end" },
      width: "75px",
    },
    {
      name: "Active Tenants",
      selector: (row) => row.active_tenants,
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Occupancy",
      selector: (row) => Number(row.occupancy_rate || 0),
      format: (row) => formatPct(row.occupancy_rate),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Collected",
      selector: (row) => Number(row.total_collected || 0),
      format: (row) => formatCurrency(row.total_collected),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Outstanding",
      selector: (row) => Number(row.total_outstanding || 0),
      format: (row) => formatCurrency(row.total_outstanding),
      sortable: true,
      style: { justifyContent: "flex-end", color: "#dc2626" },
    },
    {
      name: "Maintenance",
      selector: (row) =>
        Number(netByProperty[row.property_id]?.total_maintenance_cost || 0),
      format: (row) =>
        formatCurrency(netByProperty[row.property_id]?.total_maintenance_cost),
      sortable: true,
      style: { justifyContent: "flex-end", color: "#b45309" },
    },
    {
      name: "Net Income",
      selector: (row) =>
        Number(netByProperty[row.property_id]?.net_income || 0),
      format: (row) =>
        formatCurrency(netByProperty[row.property_id]?.net_income),
      sortable: true,
      style: { justifyContent: "flex-end", fontWeight: 600, color: "#059669" },
    },
    {
      name: "Collection Rate",
      selector: (row) => Number(row.collection_rate || 0),
      format: (row) => formatPct(row.collection_rate),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
  ];

  const resetFilters = () => {
    setPropertyId("");
    setBlockId("");
    setStartDate("");
    setEndDate("");
    setOccupancyFilter("active");
    setSearch("");
  };

  if ((loading || isLoadingFormData) && data.length === 0) {
    return <PageSkeleton cards={5} hasFilters />;
  }

  return (
    <PageWrapper showTitle={false}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">— Finance —</p>
            <h1
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Financial Summary
            </h1>
            <p className="mt-1 text-sm text-black/55">
              Revenue, maintenance, and net income across your portfolio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadFinancialData}
              disabled={loading}
              className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            {filteredData.length > 0 && (
              <DownloadPDFButton
                fileName={`financial-summary-${new Date().toISOString().split("T")[0]}.pdf`}
                title="Financial Summary"
                data={exportData}
                columns={exportColumns}
                metadata={pdfMetadata}
                label="Download Report"
              />
            )}
          </div>
        </header>

        <ReportTabs active="financial" />

        <div className="border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setBlockId("");
              }}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <select
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
              disabled={!propertyId || propertyBlocks.length === 0}
            >
              <option value="">
                {propertyId
                  ? propertyBlocks.length > 0
                    ? "All Blocks"
                    : "No blocks"
                  : "Select property first"}
              </option>
              {propertyBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>

            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value)}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="active">Active only</option>
              <option value="all">All properties</option>
              <option value="vacant">No active tenants</option>
              <option value="with_outstanding">With outstanding</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search property..."
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={loadFinancialData}
                disabled={loading}
                className="bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-5">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue)}
            icon={DollarSign}
            accent="text-green-700"
          />
          <StatCard
            label="Maintenance Cost"
            value={formatCurrency(summary.totalMaintenance)}
            icon={Wrench}
            accent="text-amber-700"
          />
          <StatCard
            label="Net Income"
            value={formatCurrency(summary.netIncome)}
            icon={TrendingUp}
            accent="text-emerald-700"
          />
          <StatCard
            label="Properties"
            value={String(summary.totalProperties)}
            icon={Building}
            accent="text-blue-700"
          />
          <StatCard
            label="Active Tenants"
            value={String(summary.totalTenants)}
            icon={Users}
            accent="text-blue-700"
          />
        </div>

        <div>
          <DataTable
            columns={columns}
            data={filteredData}
            customStyles={editorialTableStyles}
            pagination
            progressPending={loading}
            noDataComponent={
              <div className="py-10 text-center text-gray-500 text-sm">
                No financial data available.
              </div>
            }
            responsive
            striped
            highlightOnHover
          />
        </div>
      </div>
    </PageWrapper>
  );
}

function StatCard({ label, value, icon: Icon, accent = "text-black" }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
          {label}
        </p>
        {Icon && <Icon className={`h-4 w-4 ${accent}`} strokeWidth={1.8} />}
      </div>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
