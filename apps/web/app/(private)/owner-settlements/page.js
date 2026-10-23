"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Plus, RefreshCw } from "lucide-react";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { groupRowsByOwner } from "@/app/_components/OwnerPropertyAccordion";
import StatCard from "@/app/_components/StatCard";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { formatCurrency } from "@/app/_lib/formatters";
import { OwnerAdvances } from "@/app/_lib/repositories";
import { useAuth } from "@/app/_context/AuthContext";
import AdvanceForm from "../maintenance/AdvanceForm";
import { tabs } from "./constants";
import { buildDeductionColumns } from "./components/deductionColumns";
import DeductionsByOwner from "./components/DeductionsByOwner";
import DisbursementSlider from "./components/DisbursementSlider";
import DisbursementSummary from "./components/DisbursementSummary";
import { useDisbursement } from "./hooks/useDisbursement";
import { useSettlementData } from "./hooks/useSettlementData";
import { sendOwnerBrief } from "./sendOwnerBrief";
import {
  closeMonthKey,
  dateRange,
  groupSettlementsByProperty,
  monthValue,
  netRowTotals,
  withinRange,
} from "./utils/settlementMath";

export default function OwnerSettlementsPage() {
  const { permissions, hasPermission } = useAuth();
  const permissionSet = useMemo(() => new Set(permissions || []), [permissions]);
  const canExport = hasPermission("reports:export");
  const canCreateAdvances = permissionSet.has("maintenance:create");
  const canEditAdvances = permissionSet.has("maintenance:edit");
  const [activeTab, setActiveTab] = useState("close");
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [selectedEndMonth, setSelectedEndMonth] = useState(monthValue());
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [includeDeposits, setIncludeDeposits] = useState(true);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const lastCloseableMonth = monthValue(-1);
  const currentMonth = monthValue(0);

  const { properties, isLoading: isLoadingProperties } = usePropertyStructure("", "");
  const range = useMemo(
    () => dateRange(selectedMonth, selectedEndMonth),
    [selectedEndMonth, selectedMonth],
  );
  const { netRows, advances, tenants, maintenance, settlements, loading, loadData } =
    useSettlementData({ range, includeDeposits });

  const filteredAdvances = useMemo(
    () =>
      advances.filter(
        (row) =>
          row.status !== "cancelled" &&
          (!filterPropertyId || row.property_id === filterPropertyId) &&
          withinRange(row.advance_date || row.requested_date, range.startDate, range.endDate),
      ),
    [advances, filterPropertyId, range.endDate, range.startDate],
  );

  const propertiesById = useMemo(
    () => Object.fromEntries(properties.map((property) => [property.id, property])),
    [properties],
  );

  const deductionRows = useMemo(() => {
    const withOwner = (row) => {
      const property = propertiesById[row.property_id] || {};
      return {
        property_id: row.property_id,
        property_name:
          row.properties?.name || row.property_name || property.name || "Unknown Property",
        owner_name: row.properties?.owner_name || property.owner_name || null,
      };
    };

    const maintenanceDeductions = maintenance
      .filter(
        (row) =>
          (!filterPropertyId || row.property_id === filterPropertyId) &&
          withinRange(row.reported_date || row.created_at, range.startDate, range.endDate),
      )
      .map((row) => ({
        id: `maintenance-${row.id}`,
        ...withOwner(row),
        kind: "maintenance",
        type: "Maintenance",
        description: row.title || row.description || "Maintenance request",
        date: row.reported_date || row.created_at,
        amount: Number(row.actual_cost ?? row.estimated_cost ?? 0),
      }));

    const advanceDeductions = filteredAdvances.map((row) => ({
      id: `advance-${row.id}`,
      ...withOwner(row),
      kind: "advance",
      source: row,
      type: "Owner Advance",
      description: row.purpose || row.description || "Owner advance",
      date: row.advance_date || row.requested_date,
      amount: Number(row.amount || 0),
    }));

    return [...maintenanceDeductions, ...advanceDeductions].filter(
      (row) => Number(row.amount || 0) > 0,
    );
  }, [
    filterPropertyId,
    filteredAdvances,
    maintenance,
    propertiesById,
    range.endDate,
    range.startDate,
  ]);

  const deductionsByOwner = useMemo(
    () => groupRowsByOwner(deductionRows),
    [deductionRows],
  );

  const totals = useMemo(
    () =>
      netRows
        .filter((row) => !filterPropertyId || row.property_id === filterPropertyId)
        .reduce((acc, row) => {
        const next = netRowTotals(row);
        return {
          expected: acc.expected + next.expected,
          collected: acc.collected + next.gross,
          commission: acc.commission + next.commission,
          expectedPayout: acc.expectedPayout + next.expectedPayout,
          defaulted: acc.defaulted + next.defaulted,
          maintenance: acc.maintenance + next.maintenance,
          advances: acc.advances + next.advances,
          payout: acc.payout + next.payout,
          canDisburse: acc.canDisburse + next.canDisburse,
        };
      }, netRowTotals(null)),
    [filterPropertyId, netRows],
  );

  const disbursement = useDisbursement({
    properties,
    propertiesById,
    settlements,
    tenants,
    includeDeposits,
    onReleased: async () => {
      await loadData();
      setActiveTab("close");
    },
  });

  const summaryRows = useMemo(
    () =>
      groupSettlementsByProperty(
        settlements
          .filter((row) => {
            const key = closeMonthKey(row.close_month);
            if (!/^\d{4}-\d{2}$/.test(key)) return false;
            return key >= selectedMonth && key <= selectedEndMonth;
          })
          .map((row) => {
            const property = propertiesById[row.property_id];
            return {
              ...row,
              property_name: property?.name || row.property_name || "Unknown Property",
              owner_name: property?.owner_name || null,
              owner_phone: property?.owner_phone || null,
              commission_rate:
                row.commission_rate ??
                property?.commission_rate ??
                (Number(row.gross_collection || 0) > 0
                  ? (Number(row.commission_amount || 0) / Number(row.gross_collection || 1)) * 100
                  : 0),
            };
          }),
        properties,
        filterPropertyId,
      ),
    [
      filterPropertyId,
      properties,
      propertiesById,
      selectedEndMonth,
      selectedMonth,
      settlements,
    ],
  );

  const clampViewMonth = (value) => {
    const next = /^\d{4}-\d{2}$/.test(value || "") ? value : currentMonth;
    return next > currentMonth ? currentMonth : next;
  };

  const deductionColumns = useMemo(
    () =>
      buildDeductionColumns({
        onEditAdvance: canEditAdvances
          ? (row) => {
              setEditTarget(row);
              setAdvanceModalOpen(true);
            }
          : null,
        onStatusChange: canEditAdvances
          ? async (id, status) => {
              if (status === "cancelled" && !confirm("Cancel this owner advance?")) return;
              try {
                await OwnerAdvances.update(id, { status });
                showToast.success(status === "cancelled" ? "Advance cancelled." : "Advance updated.");
                loadData();
              } catch {
                showToast.error("Failed to update advance.");
              }
            }
          : null,
      }),
    [canEditAdvances, loadData],
  );

  if ((loading || isLoadingProperties) && netRows.length === 0) {
    return <PageSkeleton cards={4} hasFilters />;
  }

  return (
    <div className="space-y-2 p-1 sm:p-2">
      <header className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center whitespace-nowrap gap-2 border border-stone-300 px-4 h-9 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
            Refresh
          </button>
          {canCreateAdvances && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setAdvanceModalOpen(true);
              }}
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap bg-blue-700 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Add Advance
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-4">
        <StatCard size="sm" label="Expected rent" value={formatCurrency(totals.expected)} />
        <StatCard size="sm" label="Collected" value={formatCurrency(totals.collected)} />
        <StatCard size="sm"
          label="Expected to owner"
          value={formatCurrency(totals.expectedPayout)}
          accent="text-black/70"
        />
        <StatCard size="sm"
          label="Can disburse"
          value={formatCurrency(totals.canDisburse)}
          accent="text-green-700"
        />
      </div>

      <div className="border border-stone-200 bg-white p-4">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Month-on-month Disbursement
          </p>
          <p className="mt-0.5 text-sm font-semibold text-black">
            {range.label} ·{" "}
            {propertiesById[filterPropertyId]?.name || "All properties"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-black/50">
            If all rent is paid: {formatCurrency(totals.expectedPayout)} · From
            collection this period: {formatCurrency(totals.canDisburse)}
            {totals.defaulted > 0 &&
              ` · Defaulted rent excluded: ${formatCurrency(totals.defaulted)}`}
          </p>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              From
            </span>
            <input
              type="month"
              max={currentMonth}
              value={selectedMonth}
              onChange={(event) => {
                const value = clampViewMonth(event.target.value || lastCloseableMonth);
                setSelectedMonth(value);
                if (selectedEndMonth < value) setSelectedEndMonth(value);
              }}
              className="h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              To
            </span>
            <input
              type="month"
              max={currentMonth}
              value={selectedEndMonth}
              onChange={(event) =>
                setSelectedEndMonth(clampViewMonth(event.target.value || selectedMonth))
              }
              className="h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              Property
            </span>
            <select
              value={filterPropertyId}
              onChange={(event) => setFilterPropertyId(event.target.value)}
              className="h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => disbursement.open(selectedMonth)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap bg-black px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80 sm:col-span-2 lg:col-span-1 lg:w-auto"
          >
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            Disburse funds
          </button>
        </div>
      </div>

      <div className="flex flex-wrap border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em] w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-5 py-2 transition-colors ${
              activeTab === id
                ? "bg-blue-700 text-white"
                : "bg-white text-black/55 hover:bg-stone-50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "close" && (
        <DisbursementSummary
          rows={summaryRows}
          loading={loading}
          onResendSms={(row) => sendOwnerBrief(row, propertiesById)}
          canResendSms={canExport}
        />
      )}

      {activeTab === "deductions" && (
        <DeductionsByOwner
          rows={deductionsByOwner}
          loading={loading}
          columns={deductionColumns}
        />
      )}

      <ModalSlider
        isOpen={advanceModalOpen && (editTarget ? canEditAdvances : canCreateAdvances)}
        onClose={() => {
          setAdvanceModalOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? "Edit Owner Advance" : "Add Owner Advance"}
      >
        <AdvanceForm
          key={editTarget?.id ?? "new_advance"}
          initialData={editTarget}
          onSuccess={() => {
            setAdvanceModalOpen(false);
            setEditTarget(null);
            showToast.success(editTarget ? "Advance updated." : "Advance added.");
            loadData();
          }}
        />
      </ModalSlider>

      <DisbursementSlider
        disbursement={disbursement}
        properties={properties}
        includeDeposits={includeDeposits}
        onIncludeDepositsChange={setIncludeDeposits}
        canExport={canExport}
      />
    </div>
  );
}
