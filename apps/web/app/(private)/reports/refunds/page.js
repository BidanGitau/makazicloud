"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Refunds } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import PageWrapper from "@/app/_components/PageWrapper";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import OwnerPropertyAccordion, {
  NestedRows,
  groupRowsByOwner,
  toggleSetItem,
} from "@/app/_components/OwnerPropertyAccordion";
import { formatCurrency } from "@/app/_lib/formatters";
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
          tenantStatus: "inactive",
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
        showProperty: false,
        onProcess: canManageRefunds ? handleProcess : null,
        onCancel: canManageRefunds ? handleCancel : null,
      }),
    [canManageRefunds, handleProcess, handleCancel],
  );

  const groupedRefunds = useMemo(() => {
    const propertiesById = Object.fromEntries(
      properties.map((property) => [property.id, property]),
    );
    return groupRowsByOwner(
      filteredRows.map((row) => {
        const property = propertiesById[row.property_id] || {};
        return {
          ...row,
          id: row.tenant_id || row.id,
          property_name: row.property_name || property.name || "Unknown Property",
          owner_name: property.owner_name || row.owner_name || null,
          amount: Number(row.outstanding_refund || row.net_refund || 0),
        };
      }),
    );
  }, [filteredRows, properties]);

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

        <p className="flex-shrink-0 border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-black/60">
          Deposit refunds for <strong className="font-semibold text-black">former tenants</strong> only.
          Active tenants are not listed here — use{" "}
          <strong className="font-semibold text-black">Tenants → Cancel Lease</strong> when
          someone moves out.
        </p>

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
          {(loading || processingId !== null) && groupedRefunds.length > 0 && (
            <div className="mb-1 border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
              Loading refunds...
            </div>
          )}
          <OwnerPropertyAccordion
            rows={groupedRefunds}
            loading={loading}
            loadingLabel="Loading refunds…"
            emptyLabel={
              refundStatus === "pending"
                ? "No former tenants awaiting deposit refund. Cancel a lease on the Tenants page when someone moves out."
                : `No ${refundStatus !== "all" ? refundStatus : ""} refunds found.`
            }
            ownerStats={(owner) => [
              { label: "Properties", value: owner.properties.length },
              {
                label: "Outstanding",
                value: formatCurrency(owner.amount),
                accent: "text-red-600",
              },
            ]}
            propertyMeta={(property) =>
              `${property.items.length} tenant${property.items.length === 1 ? "" : "s"} · ${formatCurrency(property.amount)}`
            }
            renderProperty={(property) => (
              <RefundPropertyBody
                property={property}
                columns={columns}
                expandedBlocks={expandedBlocks}
                setExpandedBlocks={setExpandedBlocks}
              />
            )}
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

function RefundPropertyBody({
  property,
  columns,
  expandedBlocks,
  setExpandedBlocks,
}) {
  const blocks = new Map();
  const directTenants = [];

  for (const row of property.items) {
    if (row.block_id) {
      if (!blocks.has(row.block_id)) {
        blocks.set(row.block_id, {
          id: row.block_id,
          name: row.block_name || "Block",
          tenants: [],
        });
      }
      blocks.get(row.block_id).tenants.push(row);
    } else {
      directTenants.push(row);
    }
  }

  const blockList = [...blocks.values()];
  if (!blockList.length) {
    return <NestedRows columns={columns} rows={property.items} />;
  }

  return (
    <div className="space-y-1">
      {blockList.map((block) => {
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
                <p className="truncate text-xs font-semibold text-black">{block.name}</p>
              </div>
              <span className="text-[11px] text-black/55">
                {block.tenants.length} tenant{block.tenants.length === 1 ? "" : "s"}
              </span>
            </button>
            {blockOpen ? (
              <NestedRows columns={columns} rows={block.tenants} />
            ) : null}
          </div>
        );
      })}
      {directTenants.length > 0 ? (
        <div className="border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-2 py-1.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
              Direct Tenants
            </p>
          </div>
          <NestedRows columns={columns} rows={directTenants} />
        </div>
      ) : null}
    </div>
  );
}
