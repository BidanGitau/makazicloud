"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { PropertyStatementTenants } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import { TrendingUp, DollarSign, Building, Wallet } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import ReportTabs from "../ReportTabs";
import { useAuth } from "@/app/_context/AuthContext";

export default function TenantStatementPage() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission("reports:export");
  const [propertyId, setPropertyId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const {
    properties,
    propertyBlocks,
    propertyUnits: blockUnits,
    isLoading: isLoadingFormData,
  } = usePropertyStructure(propertyId, blockId);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [data, totals] = await Promise.all([
        PropertyStatementTenants.getStatement({
          propertyId: propertyId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        PropertyStatementTenants.getSummary({
          propertyId: propertyId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);
      setRows(data);
      setSummary(totals);
    } catch (err) {
      console.error("Error loading report:", err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const selectedBlockName = useMemo(
    () => propertyBlocks.find((b) => b.id === blockId)?.name || "",
    [propertyBlocks, blockId],
  );

  const filteredRows = useMemo(() => {
    let out = rows;
    if (blockId) {
      const blockUnitNumbers = new Set(
        blockUnits.map((u) => String(u.unit_number || "").toLowerCase()),
      );
      out = out.filter((row) => {
        if (row.block_id) return row.block_id === blockId;
        if (row.block_name) return row.block_name === selectedBlockName;
        return blockUnitNumbers.has(
          String(row.unit_number || "").toLowerCase(),
        );
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((row) => row.tenant_name?.toLowerCase().includes(q));
    }
    return out;
  }, [rows, blockId, selectedBlockName, blockUnits, search]);

  const effectiveSummary = useMemo(() => {
    if (!blockId) return summary;
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalRent += Number(row.rent_collected || 0);
        acc.totalArrears += Number(row.arrears_paid || 0);
        acc.totalUtilities += Number(row.utilities_paid || 0);
        acc.totalUtilitiesBilled += Number(row.utilities_billed || 0);
        acc.totalCollected += Number(row.total_collected || 0);
        return acc;
      },
      {
        totalRent: 0,
        totalArrears: 0,
        totalUtilities: 0,
        totalUtilitiesBilled: 0,
        totalCollected: 0,
      },
    );
  }, [summary, blockId, filteredRows]);

  const exportData = useMemo(() => {
    const data = filteredRows.map((row) => ({
      property: row.property_name || "N/A",
      block: row.block_name || selectedBlockName || "N/A",
      tenant: row.tenant_name || "N/A",
      unit: row.unit_number || "N/A",
      rent: Number(row.rent_collected || 0),
      arrears: Number(row.arrears_paid || 0),
      utilities: Number(row.utilities_paid || 0),
      total: Number(row.total_collected || 0),
    }));
    if (data.length > 0 && effectiveSummary) {
      data.push({
        property: "TOTAL",
        block: "",
        tenant: "",
        unit: "",
        rent: Number(effectiveSummary.totalRent || 0),
        arrears: Number(effectiveSummary.totalArrears || 0),
        utilities: Number(effectiveSummary.totalUtilities || 0),
        total: Number(effectiveSummary.totalCollected || 0),
      });
    }
    return data;
  }, [filteredRows, effectiveSummary, selectedBlockName]);

  const exportColumns = [
    { header: "Property", key: "property", width: "18%" },
    { header: "Block", key: "block", width: "10%" },
    { header: "Tenant", key: "tenant", width: "18%" },
    { header: "Unit", key: "unit", width: "8%" },
    { header: "Rent (KSh)", key: "rent", type: "currency", width: "12%" },
    { header: "Arrears (KSh)", key: "arrears", type: "currency", width: "12%" },
    { header: "Utils (KSh)", key: "utilities", type: "currency", width: "11%" },
    { header: "Total (KSh)", key: "total", type: "currency", width: "11%" },
  ];

  const pdfMetadata = useMemo(() => {
    if (!effectiveSummary) return {};
    return {
      Property:
        properties.find((p) => p.id === propertyId)?.name || "All Properties",
      Period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
      Records: filteredRows.length,
      "Rent Collected": formatCurrency(effectiveSummary.totalRent),
      "Arrears Settled": formatCurrency(effectiveSummary.totalArrears),
      "Utilities Billed": formatCurrency(effectiveSummary.totalUtilitiesBilled),
      "Utilities Paid": formatCurrency(effectiveSummary.totalUtilities),
      "Total Collected": formatCurrency(effectiveSummary.totalCollected),
    };
  }, [
    effectiveSummary,
    properties,
    propertyId,
    startDate,
    endDate,
    filteredRows.length,
  ]);

  const columns = [
    {
      name: "Property",
      selector: (row) => row.property_name || "N/A",
      sortable: true,
      grow: 1.2,
    },
    {
      name: "Tenant",
      selector: (row) => row.tenant_name || "N/A",
      sortable: true,
      grow: 1.2,
    },
    {
      name: "Unit",
      selector: (row) => row.unit_number || "N/A",
      sortable: true,
      width: "80px",
    },
    {
      name: "Rent Collected",
      selector: (row) => Number(row.rent_collected || 0),
      format: (row) => formatCurrency(row.rent_collected),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Arrears Settled",
      selector: (row) => Number(row.arrears_paid || 0),
      format: (row) => formatCurrency(row.arrears_paid),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Utils Billed",
      selector: (row) => Number(row.utilities_billed || 0),
      format: (row) => formatCurrency(row.utilities_billed),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Utils Paid",
      selector: (row) => Number(row.utilities_paid || 0),
      format: (row) => formatCurrency(row.utilities_paid),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Total Collected",
      selector: (row) => Number(row.total_collected || 0),
      format: (row) => formatCurrency(row.total_collected),
      sortable: true,
      style: { justifyContent: "flex-end", fontWeight: 600 },
    },
  ];

  if ((loading || isLoadingFormData) && rows.length === 0) {
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
              Tenant Statement
            </h1>
            <p className="mt-1 text-sm text-black/55">
              Per-tenant rent, arrears, and utility collection over a period.
            </p>
          </div>
          {canExport && filteredRows.length > 0 && (
            <DownloadPDFButton
              fileName={`tenant-statement-${startDate || "all"}-to-${endDate || "all"}.pdf`}
              title="Tenant Statement"
              data={exportData}
              columns={exportColumns}
              metadata={pdfMetadata}
              label="Download Report"
            />
          )}
        </header>

        <ReportTabs active="tenant" />

        {effectiveSummary && (
          <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-5">
            <StatCard
              label="Rent Collected"
              value={formatCurrency(effectiveSummary.totalRent)}
              icon={TrendingUp}
              accent="text-green-700"
            />
            <StatCard
              label="Arrears Settled"
              value={formatCurrency(effectiveSummary.totalArrears)}
              icon={DollarSign}
              accent="text-blue-700"
            />
            <StatCard
              label="Utils Billed"
              value={formatCurrency(effectiveSummary.totalUtilitiesBilled ?? 0)}
              icon={Building}
              accent="text-amber-700"
            />
            <StatCard
              label="Utils Paid"
              value={formatCurrency(effectiveSummary.totalUtilities)}
              icon={Building}
              accent="text-blue-700"
            />
            <StatCard
              label="Total Collected"
              value={formatCurrency(effectiveSummary.totalCollected)}
              icon={Wallet}
              accent="text-emerald-700"
            />
          </div>
        )}

        <div className="border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setBlockId("");
              }}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
              {propertyBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant…"
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
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div>
          <DataTable
            columns={columns}
            data={filteredRows}
            customStyles={editorialTableStyles}
            pagination
            progressPending={loading}
            noDataComponent={
              <div className="py-10 text-center text-gray-500 text-sm">
                No tenant data found.
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
