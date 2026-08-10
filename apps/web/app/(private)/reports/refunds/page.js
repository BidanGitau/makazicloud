"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { Refunds } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import { formatCurrency } from "@/app/_lib/formatters";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import { buildColumns, exportColumns } from "./refundsColumns";
import RefundReceiptModal from "./RefundReceiptModal";
import { useAuth } from "@/app/_context/AuthContext";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
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
  const [refundStatus, setRefundStatus] = useState("pending");
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

  const { properties, blocks, isLoading: isLoadingForm } = useFormData();

  const propertyBlocks = useMemo(
    () => blocks.filter((b) => b.property_id === propertyId),
    [blocks, propertyId],
  );

  const filteredRows = useMemo(() => {
    let out = rows;
    if (refundStatus !== "all") {
      out = out.filter((r) => String(r.status || "").toLowerCase() === refundStatus);
    }
    if (blockId) out = out.filter((r) => r.block_id === blockId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.tenant_name?.toLowerCase().includes(q));
    }
    return out;
  }, [rows, blockId, refundStatus, search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await Refunds.getWithDetails({
          propertyId: propertyId || undefined,
          tenantStatus: "all",
        }),
      );
    } catch (err) {
      console.error(err);
      showToast.error("Failed to load refunds.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

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
      tenants: filteredRows.length,
      totalDeposits: filteredRows.reduce((s, r) => s + Number(r.total_deposit || 0), 0),
      totalDeductions: filteredRows.reduce((s, r) => s + Number(r.deductions || 0), 0),
      totalRefunded: filteredRows.reduce(
        (s, r) => s + Number(r.amount_refunded || 0),
        0,
      ),
      totalOutstanding: filteredRows.reduce(
        (s, r) => s + Number(r.outstanding_refund || 0),
        0,
      ),
    }),
    [filteredRows, rows.length],
  );

  const exportData = useMemo(
    () =>
      filteredRows.map((r) => ({
        tenant: r.tenant_name,
        property: r.property_name || "—",
        unit: r.unit_number ? `Unit ${r.unit_number}` : "—",
        deposit: Number(r.total_deposit || 0),
        arrears: Number(r.arrears_deductions || 0),
        repairs: Number(r.fault_deductions || 0),
        net_refund: Number(r.net_refund || 0),
        status: r.status,
      })),
    [filteredRows],
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onProcess: canManageRefunds ? handleProcess : null,
        onCancel: canManageRefunds ? handleCancel : null,
      }),
    [canManageRefunds, handleProcess, handleCancel],
  );

  const groupedRefunds = useMemo(() => {
    const propertyMap = new Map();
    filteredRows.forEach((row) => {
      const propertyKey = row.property_id || row.property_name || "unknown";
      if (!propertyMap.has(propertyKey)) {
        propertyMap.set(propertyKey, {
          id: propertyKey,
          name: row.property_name || "Unknown Property",
          blocks: new Map(),
          tenants: [],
        });
      }
      const property = propertyMap.get(propertyKey);
      if (row.block_id) {
        if (!property.blocks.has(row.block_id)) {
          property.blocks.set(row.block_id, {
            id: row.block_id,
            name: row.block_name || "Block",
            tenants: [],
          });
        }
        property.blocks.get(row.block_id).tenants.push(row);
      } else {
        property.tenants.push(row);
      }
    });

    return [...propertyMap.values()].map((property) => {
      const blocksList = [...property.blocks.values()];
      const tenants = [
        ...property.tenants,
        ...blocksList.flatMap((block) => block.tenants),
      ];
      return {
        ...property,
        blocks: blocksList,
        tenants,
        tenant_count: tenants.length,
        total_deposit: tenants.reduce((sum, row) => sum + Number(row.total_deposit || 0), 0),
        total_deductions: tenants.reduce((sum, row) => sum + Number(row.deductions || 0), 0),
        net_refund: tenants.reduce((sum, row) => sum + Number(row.net_refund || 0), 0),
      };
    });
  }, [filteredRows]);

  if ((loading || isLoadingForm) && rows.length === 0)
    return <PageSkeleton cards={4} hasFilters />;

  return (
    <PageWrapper showTitle={false} flexLayout>
      <div className="flex h-full w-full flex-col gap-2 overflow-y-auto overflow-x-hidden px-1 py-1 sm:px-2">
        <header className="flex flex-shrink-0 justify-end">
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
                  onClick={() => setRefundStatus(value)}
                  className={`px-4 py-2 transition-colors ${
                    refundStatus === value
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

        <div className="min-h-[360px] flex-1 overflow-auto">
          {groupedRefunds.length === 0 ? (
            <div className="border border-stone-200 bg-white py-12 text-center">
              <p className="section-label">— Empty —</p>
              <p className="mt-2 text-sm font-bold text-black">
                No {refundStatus !== "all" ? refundStatus : ""} refunds found
              </p>
              <p className="mt-1 text-sm text-black/55">
                Try a different filter.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {(loading || processingId !== null) && (
                <div className="border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
                  Loading refunds...
                </div>
              )}
              {groupedRefunds.map((property) => {
                const directTenants = property.tenants.filter((row) => !row.block_id);
                const propertyOpen = expandedProperties.has(property.id);
                return (
                  <section
                    key={property.id}
                    className="border border-stone-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSetItem(setExpandedProperties, property.id)}
                      className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-4"
                      aria-expanded={propertyOpen}
                    >
                      <div className="flex items-center gap-2 bg-white px-2 py-1.5 sm:col-span-1">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-3 w-3 text-black/55 transition-transform ${
                              propertyOpen ? "rotate-0" : "-rotate-90"
                            }`}
                            strokeWidth={2}
                          />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
                          {property.name}
                        </p>
                        <p className="shrink-0 text-[11px] text-black/55">
                          {property.tenant_count} tenant{property.tenant_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      {[
                        ["Deposits", property.total_deposit],
                        ["Deductions", property.total_deductions],
                        ["Net Refund", property.net_refund],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-white px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                            {label}
                          </p>
                          <p className="text-xs font-black tabular-nums text-black">
                            {formatCurrency(value)}
                          </p>
                        </div>
                      ))}
                    </button>

                    {propertyOpen && (
                      <div className="space-y-1 bg-stone-50 p-1.5">
                        {property.blocks.map((block) => {
                          const blockKey = `${property.id}:${block.id}`;
                          const blockOpen = expandedBlocks.has(blockKey);
                          return (
                            <div key={block.id} className="border border-stone-200 bg-white">
                              <button
                                type="button"
                                onClick={() => toggleSetItem(setExpandedBlocks, blockKey)}
                                className="flex w-full items-center justify-between border-b border-stone-200 px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
                                aria-expanded={blockOpen}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <ChevronDown
                                    className={`h-3 w-3 text-black/55 transition-transform ${
                                      blockOpen ? "rotate-0" : "-rotate-90"
                                    }`}
                                    strokeWidth={2}
                                  />
                                  <p className="truncate text-xs font-semibold text-black">
                                    {block.name}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-[11px] text-black/55">
                                  <span>
                                    {block.tenants.length} tenant{block.tenants.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </button>
                              {blockOpen && (
                                <RefundRows columns={columns} rows={block.tenants} />
                              )}
                            </div>
                          );
                        })}

                        {directTenants.length > 0 && (
                          <div className="border border-stone-200 bg-white">
                            <div className="border-b border-stone-200 px-2 py-1.5">
                              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                                Direct Tenants
                              </p>
                            </div>
                            <RefundRows columns={columns} rows={directTenants} />
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
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

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}

function RefundRows({ columns, rows }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      customStyles={compactEditorialTableStyles}
      noHeader
      dense
      responsive
      striped
      highlightOnHover
      noDataComponent={
        <div className="py-5 text-center">
          <p className="section-label">— Empty —</p>
          <p className="mt-2 text-sm font-bold text-black">No refunds found</p>
        </div>
      }
    />
  );
}
