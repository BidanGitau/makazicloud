"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Refunds } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import { formatCurrency } from "@/app/_lib/formatters";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { buildColumns, exportColumns } from "./refundsColumns";
import RefundReceiptModal from "./RefundReceiptModal";
import { useAuth } from "@/app/_context/AuthContext";

const STATUS_FILTERS = [
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
];

export default function RefundsPage() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission("reports:export");
  const canManageRefunds =
    hasPermission("payments:create") &&
    hasPermission("payments:edit") &&
    hasPermission("tenants:edit") &&
    hasPermission("units:edit") &&
    hasPermission("arrears:manage");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [search, setSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("inactive");

  const { properties, blocks, isLoading: isLoadingForm } = useFormData();

  const propertyBlocks = useMemo(
    () => blocks.filter((b) => b.property_id === propertyId),
    [blocks, propertyId],
  );

  const filteredRows = useMemo(() => {
    let out = rows;
    if (blockId) out = out.filter((r) => r.block_id === blockId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.tenant_name?.toLowerCase().includes(q));
    }
    return out;
  }, [rows, blockId, search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await Refunds.getWithDetails({
          propertyId: propertyId || undefined,
          tenantStatus: tenantStatus || "all",
        }),
      );
    } catch (err) {
      console.error(err);
      showToast.error("Failed to load refunds.");
    } finally {
      setLoading(false);
    }
  }, [propertyId, tenantStatus]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleProcess = useCallback(
    async (row) => {
      setProcessingId(row.tenant_id);
      try {
        const result = await Refunds.process(row);
        showToast.success(`Refund processed for ${row.tenant_name}`);
        setReceipt(result);
        await fetchAll();
      } catch (err) {
        console.error(err);
        showToast.error(err?.message || "Failed to process refund.");
      } finally {
        setProcessingId(null);
      }
    },
    [fetchAll],
  );

  const handleCancel = useCallback(async (row) => {
    try {
      await Refunds.recordPayment(row.tenant_id, row.unit_id, {
        status: "cancelled",
      });
      setRows((prev) =>
        prev.map((r) =>
          r.tenant_id === row.tenant_id ? { ...r, status: "cancelled" } : r,
        ),
      );
    } catch (err) {
      console.error(err);
      showToast.error("Failed to cancel refund.");
    }
  }, []);

  const summary = useMemo(
    () => ({
      tenants: rows.length,
      totalDeposits: rows.reduce((s, r) => s + Number(r.total_deposit || 0), 0),
      totalDeductions: rows.reduce((s, r) => s + Number(r.deductions || 0), 0),
      totalRefunded: rows.reduce(
        (s, r) => s + Number(r.amount_refunded || 0),
        0,
      ),
      totalOutstanding: rows.reduce(
        (s, r) => s + Number(r.outstanding_refund || 0),
        0,
      ),
    }),
    [rows],
  );

  const exportData = useMemo(
    () =>
      rows.map((r) => ({
        tenant: r.tenant_name,
        property: r.property_name || "—",
        unit: r.unit_number ? `Unit ${r.unit_number}` : "—",
        deposit: Number(r.total_deposit || 0),
        arrears: Number(r.arrears_deductions || 0),
        repairs: Number(r.fault_deductions || 0),
        net_refund: Number(r.net_refund || 0),
        status: r.status,
      })),
    [rows],
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onProcess: canManageRefunds ? handleProcess : null,
        onCancel: canManageRefunds ? handleCancel : null,
      }),
    [canManageRefunds, handleProcess, handleCancel],
  );

  if ((loading || isLoadingForm) && rows.length === 0)
    return <PageSkeleton cards={4} hasFilters />;

  return (
    <PageWrapper showTitle={false} flexLayout>
      <div className="flex h-full w-full flex-col gap-5 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">— Finance —</p>
            <h1
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Refunds
            </h1>
            <p className="mt-1 text-sm text-black/55">
              Deposit refunds for departing tenants. Arrears and repair
              deductions are computed automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              disabled={loading}
              className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            {canExport && rows.length > 0 && (
              <DownloadPDFButton
                fileName={`refunds-${new Date().toISOString().split("T")[0]}.pdf`}
                title="Outstanding Refunds"
                data={exportData}
                columns={exportColumns}
                metadata={{
                  Generated: new Date().toLocaleDateString("en-KE"),
                  Tenants: String(summary.tenants),
                  "Total Deposits": formatCurrency(summary.totalDeposits),
                  "Total Deductions": formatCurrency(summary.totalDeductions),
                  "Total Refunded": formatCurrency(summary.totalRefunded),
                  "Total Outstanding": formatCurrency(summary.totalOutstanding),
                }}
                label="Download Report"
              />
            )}
          </div>
        </header>

        <div className="grid flex-shrink-0 grid-cols-2 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-4">
          {[
            { label: "Tenants", value: String(summary.tenants) },
            {
              label: "Total Deposits",
              value: formatCurrency(summary.totalDeposits),
            },
            {
              label: "Total Deductions",
              value: formatCurrency(summary.totalDeductions),
              accent: "text-amber-700",
            },
            {
              label: "Still Outstanding",
              value: formatCurrency(summary.totalOutstanding),
              accent: "text-red-600",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                {card.label}
              </p>
              <p
                className={`mt-1 text-lg font-black tabular-nums ${
                  card.accent || "text-black"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
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

            {propertyBlocks.length > 0 && (
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              >
                <option value="">All Blocks</option>
                {propertyBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant…"
              className="w-48 border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />

            <div className="flex border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em]">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTenantStatus(value)}
                  className={`px-4 py-2 transition-colors ${
                    tenantStatus === value
                      ? "bg-blue-700 text-white"
                      : "bg-white text-black/55 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredRows}
            customStyles={editorialTableStyles}
            pagination
            progressPending={loading || processingId !== null}
            noDataComponent={
              <div className="py-12 text-center">
                <p className="section-label">— Empty —</p>
                <p className="mt-2 text-sm font-bold text-black">
                  No {tenantStatus !== "all" ? tenantStatus : ""} tenants found
                </p>
                <p className="mt-1 text-sm text-black/55">
                  Try a different filter.
                </p>
              </div>
            }
            responsive
            striped
            highlightOnHover
          />
        </div>
      </div>
      <RefundReceiptModal
        receipt={receipt}
        onClose={() => setReceipt(null)}
        canExport={canExport}
      />
    </PageWrapper>
  );
}
