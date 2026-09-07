"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { formatCurrency } from "@/app/_lib/formatters";
import { apiFetch } from "@/app/_lib/api/client";
import {
  Maintenance,
  OwnerAdvances,
  OwnerSettlements,
  PropertyNetIncome,
  TenantOverview,
} from "@/app/_lib/repositories";
import { useAuth } from "@/app/_context/AuthContext";
import AdvanceForm from "../maintenance/AdvanceForm";
import {
  buildAdvanceColumns,
  maintenanceTableStyles,
} from "../maintenance/MaintenanceColumns";
import {
  buildOwnerDisbursementSms,
  formatMonthLabel,
} from "./ownerDisbursementSms";

/** Disbursement defaults to the last completed month (not the current in-progress month). */
const monthValue = (offset = -1) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
};

const tabs = [
  { id: "close", label: "Disbursement", Icon: ClipboardCheck },
  { id: "advances", label: "Owner Advances", Icon: Wallet },
  { id: "deductions", label: "Deductions", Icon: ReceiptText },
];

const payoutModes = [
  { value: "", label: "How to pay" },
  { value: "bank", label: "Bank Transfer" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
];

const deductionColumns = [
  {
    name: "Property",
    selector: (row) => row.property_name,
    sortable: true,
    grow: 1.2,
  },
  {
    name: "Type",
    selector: (row) => row.type,
    sortable: true,
    width: "140px",
  },
  {
    name: "Description",
    selector: (row) => row.description,
    grow: 1.6,
    wrap: true,
  },
  {
    name: "Date",
    selector: (row) => row.date,
    format: (row) => formatDate(row.date),
    sortable: true,
    width: "130px",
  },
  {
    name: "Amount",
    selector: (row) => Number(row.amount || 0),
    format: (row) => formatCurrency(row.amount),
    sortable: true,
    style: { justifyContent: "flex-end" },
    width: "150px",
  },
];

const breakdownColumns = [
  { header: "Item", key: "item", width: "34%" },
  {
    header: "Amount",
    key: "amount",
    width: "22%",
    render: currencyOrDash,
    excelRender: numberOrBlank,
  },
  { header: "Notes", key: "notes", width: "44%" },
];

function dateRange(month, endMonth = month) {
  const value = /^\d{4}-\d{2}$/.test(month || "") ? month : monthValue();
  const endValue = /^\d{4}-\d{2}$/.test(endMonth || "") ? endMonth : value;
  const [year, monthIndex] = value.split("-").map(Number);
  const [endYear, endMonthIndex] = endValue.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  let end = new Date(Date.UTC(endYear, endMonthIndex, 0));
  if (end < start) end = new Date(Date.UTC(year, monthIndex, 0));
  const sameMonth = value === endValue;
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: sameMonth
      ? start.toLocaleDateString("en-KE", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : `${start.toLocaleDateString("en-KE", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })} - ${end.toLocaleDateString("en-KE", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}`,
  };
}

function netRowTotals(row) {
  if (!row) {
    return {
      expected: 0,
      gross: 0,
      collected: 0,
      commission: 0,
      expectedPayout: 0,
      maintenance: 0,
      advances: 0,
      payout: 0,
      canDisburse: 0,
    };
  }
  const collected = Number(row.total_collected || 0);
  const net = Number(row.net_income || 0);
  return {
    expected: Number(row.expected_rent || 0),
    gross: collected,
    collected,
    commission: Number(row.commission_amount || 0),
    expectedPayout: Number(row.expected_payout || 0),
    maintenance: Number(row.total_maintenance_cost || 0),
    advances: Number(row.total_advances || 0),
    payout: net,
    canDisburse: Number(
      row.can_disburse ?? (collected > 0 ? Math.max(0, net) : 0),
    ),
  };
}

function closeMonthKey(value) {
  const raw = String(value || "");
  const dayMatch = raw.match(/^(\d{4}-\d{2})-\d{2}/);
  if (dayMatch) return dayMatch[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 7);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function otherCostsAmount(row) {
  return Number(row.maintenance_amount || 0) + Number(row.advances_amount || 0);
}

function otherCostsTitle(row) {
  return `Repairs ${formatCurrency(row.maintenance_amount)} · Advances ${formatCurrency(row.advances_amount)}`;
}

function emptyPropertyGroup(property) {
  return {
    id: property.id,
    property_id: property.id,
    property_name: property.name || "Unknown Property",
    owner_name: property.owner_name || null,
    owner_phone: property.owner_phone || null,
    months: [],
    gross_collection: 0,
    commission_amount: 0,
    other_costs: 0,
    owner_payout: 0,
    latest_closed_at: null,
  };
}

function groupSettlementsByProperty(rows, properties = [], filterPropertyId = "") {
  const propertiesById = Object.fromEntries(
    properties.map((property) => [property.id, property]),
  );
  const groups = new Map();

  if (filterPropertyId && propertiesById[filterPropertyId]) {
    groups.set(filterPropertyId, emptyPropertyGroup(propertiesById[filterPropertyId]));
  }

  for (const row of rows) {
    const propertyId = row.property_id || "unknown";
    if (filterPropertyId && propertyId !== filterPropertyId) continue;
    if (!groups.has(propertyId)) {
      const property = propertiesById[propertyId] || {};
      groups.set(propertyId, {
        ...emptyPropertyGroup({
          id: propertyId,
          name: property.name || row.property_name,
          owner_name: property.owner_name || row.owner_name,
          owner_phone: property.owner_phone || row.owner_phone,
        }),
      });
    }
    const group = groups.get(propertyId);
    group.months.push(row);
    group.gross_collection += Number(row.gross_collection || 0);
    group.commission_amount += Number(row.commission_amount || 0);
    group.other_costs += otherCostsAmount(row);
    group.owner_payout += Number(row.owner_payout || 0);
    const closedAt = row.closed_at || row.created_at;
    if (
      closedAt &&
      (!group.latest_closed_at || String(closedAt) > String(group.latest_closed_at))
    ) {
      group.latest_closed_at = closedAt;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      months: [...group.months].sort((a, b) =>
        closeMonthKey(b.close_month).localeCompare(closeMonthKey(a.close_month)),
      ),
      commission_rate:
        group.gross_collection > 0
          ? (group.commission_amount / group.gross_collection) * 100
          : 0,
    }))
    .sort((a, b) =>
      String(a.property_name).localeCompare(String(b.property_name)),
    );
}

function toggleSetItem(setter, id) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

const summaryGridClass =
  "grid grid-cols-[minmax(140px,1.5fr)_repeat(4,minmax(88px,1fr))_36px]";

function SummaryAmount({ value, accent = "text-black", title }) {
  return (
    <p
      className={`px-2 py-1 text-right text-[11px] font-semibold tabular-nums leading-5 ${accent}`}
      title={title}
    >
      {formatCurrency(value)}
    </p>
  );
}

function DisbursementSummary({ rows, loading, onResendSms, canResendSms }) {
  const [expandedProperties, setExpandedProperties] = useState(new Set());

  if (loading && !rows.length) {
    return (
      <div className="border border-stone-200 bg-white py-10 text-center text-sm text-black/45">
        Loading disbursements…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="border border-stone-200 bg-white py-10 text-center text-sm text-black/45">
        No disbursements in this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-stone-200 bg-white">
      <div className="min-w-[640px]">
      <div
        className={`${summaryGridClass} border-b border-stone-200 bg-stone-50`}
      >
        {["Property / month", "Collected", "Commission", "Other costs", "Disbursed", ""].map(
          (label) => (
            <p
              key={label || "menu"}
              className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-black/45 ${
                label && label !== "Property / month" ? "text-right" : ""
              }`}
              title={label === "Other costs" ? "Repairs and owner advances" : undefined}
            >
              {label}
            </p>
          ),
        )}
      </div>
      {rows.map((property) => {
        const open = expandedProperties.has(property.id);
        return (
          <section key={property.id} className="border-b border-stone-200 last:border-b-0">
            <button
              type="button"
              onClick={() => toggleSetItem(setExpandedProperties, property.id)}
              className={`${summaryGridClass} w-full text-left hover:bg-stone-50`}
              aria-expanded={open}
            >
              <div className="flex min-w-0 items-center gap-1.5 px-2 py-1">
                <ChevronDown
                  className={`h-3 w-3 shrink-0 text-black/55 transition-transform ${
                    open ? "rotate-0" : "-rotate-90"
                  }`}
                  strokeWidth={2}
                />
                <p className="truncate text-[12px] font-bold text-black">
                  {property.property_name}
                  <span className="ml-1.5 font-medium text-black/40">
                    {property.months.length}
                  </span>
                </p>
              </div>
              <SummaryAmount value={property.gross_collection} />
              <SummaryAmount value={property.commission_amount} accent="text-blue-700" />
              <SummaryAmount
                value={property.other_costs}
                accent="text-amber-800"
                title="Repairs and owner advances"
              />
              <SummaryAmount value={property.owner_payout} accent="text-green-700" />
              <span />
            </button>
            {open ? (
              property.months.length ? (
                property.months.map((month) => (
                  <div
                    key={month.id}
                    className={`${summaryGridClass} bg-stone-50/80`}
                  >
                    <p className="truncate px-2 py-1 pl-7 text-[11px] leading-5 text-black/70">
                      {formatMonthLabel(month.close_month)}
                    </p>
                    <SummaryAmount value={month.gross_collection} />
                    <SummaryAmount value={month.commission_amount} accent="text-blue-700" />
                    <SummaryAmount
                      value={otherCostsAmount(month)}
                      accent="text-amber-800"
                      title={otherCostsTitle(month)}
                    />
                    <SummaryAmount value={month.owner_payout} accent="text-green-700" />
                    <div className="flex items-center justify-end pr-1">
                      {canResendSms ? (
                        <EllipsisMenu
                          menuId={`disburse-${month.id}`}
                          items={[
                            {
                              label: "Resend SMS brief",
                              onClick: () => onResendSms?.(month),
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-7 py-2 text-[11px] text-black/45">
                  No disbursement months in this period.
                </p>
              )
            ) : null}
          </section>
        );
      })}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });
}

function withinRange(value, startDate, endDate) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return time >= new Date(startDate).getTime() && time <= new Date(`${endDate}T23:59:59`).getTime();
}

function currencyOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
}

function numberOrBlank(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value || 0);
}

export default function OwnerSettlementsPage() {
  const { permissions, hasPermission } = useAuth();
  const permissionSet = useMemo(() => new Set(permissions || []), [permissions]);
  const canExport = hasPermission("reports:export");
  const canCreateAdvances = permissionSet.has("maintenance:create");
  const canEditAdvances = permissionSet.has("maintenance:edit");
  const [activeTab, setActiveTab] = useState("close");
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [selectedEndMonth, setSelectedEndMonth] = useState(monthValue());
  const [disburseMonth, setDisburseMonth] = useState(monthValue());
  const [sliderNetRow, setSliderNetRow] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [payoutMode, setPayoutMode] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [netRows, setNetRows] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingClose, setSavingClose] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const lastCloseableMonth = monthValue();
  const currentMonth = monthValue(0);

  const { properties, isLoading: isLoadingProperties } = usePropertyStructure("", "");
  const range = useMemo(
    () => dateRange(selectedMonth, selectedEndMonth),
    [selectedEndMonth, selectedMonth],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const match = {
        start_date: range.startDate,
        end_date: range.endDate,
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
  }, [range.endDate, range.startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeModal !== "close") {
      setSliderNetRow(null);
      return;
    }
    if (!propertyId) {
      setSliderNetRow(null);
      return undefined;
    }
    const period = dateRange(disburseMonth);
    let cancelled = false;
    PropertyNetIncome.getAll({
      match: {
        property_id: propertyId,
        start_date: period.startDate,
        end_date: period.endDate,
      },
    })
      .then((rows) => {
        if (cancelled) return;
        setSliderNetRow(
          (rows || []).find((row) => row.property_id === propertyId) || null,
        );
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setSliderNetRow(null);
          showToast.error("Failed to load collection for this month.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeModal, disburseMonth, propertyId]);

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

  const deductionRows = useMemo(() => {
    const maintenanceDeductions = maintenance
      .filter(
        (row) =>
          (!filterPropertyId || row.property_id === filterPropertyId) &&
          withinRange(row.reported_date || row.created_at, range.startDate, range.endDate),
      )
      .map((row) => ({
        id: `maintenance-${row.id}`,
        property_name: row.properties?.name || row.property_name || "Unknown Property",
        type: "Maintenance",
        description: row.title || row.description || "Maintenance request",
        date: row.reported_date || row.created_at,
        amount: Number(row.actual_cost ?? row.estimated_cost ?? 0),
      }));

    const advanceDeductions = filteredAdvances.map((row) => ({
      id: `advance-${row.id}`,
      property_name: row.properties?.name || row.property_name || "Unknown Property",
      type: "Owner Advance",
      description: row.purpose || row.description || "Owner advance",
      date: row.advance_date || row.requested_date,
      amount: Number(row.amount || 0),
    }));

    return [...maintenanceDeductions, ...advanceDeductions].filter(
      (row) => Number(row.amount || 0) > 0,
    );
  }, [filterPropertyId, filteredAdvances, maintenance, range.endDate, range.startDate]);

  const propertyTenantCount = useMemo(() => {
    if (!propertyId) return 0;
    return new Set(
      tenants
        .filter((tenant) => tenant.property_id === propertyId)
        .map((tenant) => tenant.tenant_id || tenant.id || tenant.full_name),
    ).size;
  }, [propertyId, tenants]);

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
          maintenance: acc.maintenance + next.maintenance,
          advances: acc.advances + next.advances,
          payout: acc.payout + next.payout,
          canDisburse: acc.canDisburse + next.canDisburse,
        };
      }, netRowTotals(null)),
    [filterPropertyId, netRows],
  );

  const selectedProperty = properties.find((property) => property.id === propertyId);
  const propertiesById = useMemo(
    () => Object.fromEntries(properties.map((property) => [property.id, property])),
    [properties],
  );
  const closeRange = useMemo(() => dateRange(disburseMonth), [disburseMonth]);
  const existingClose = useMemo(
    () =>
      settlements.find(
        (row) =>
          row.property_id === propertyId &&
          closeMonthKey(row.close_month) === disburseMonth,
      ) || null,
    [disburseMonth, propertyId, settlements],
  );
  const liveTotals = useMemo(() => netRowTotals(sliderNetRow), [sliderNetRow]);
  const closeTotals = useMemo(
    () =>
      existingClose
        ? {
            expected: liveTotals.expected,
            expectedPayout: liveTotals.expectedPayout,
            gross: Number(existingClose.gross_collection || 0),
            commission: Number(existingClose.commission_amount || 0),
            maintenance: Number(existingClose.maintenance_amount || 0),
            advances: Number(existingClose.advances_amount || 0),
            payout: Number(existingClose.owner_payout || 0),
            canDisburse: Number(existingClose.owner_payout || 0),
          }
        : liveTotals,
    [existingClose, liveTotals],
  );

  const disbursementOverview = useMemo(() => {
    const totalDeductions =
      closeTotals.commission + closeTotals.maintenance + closeTotals.advances;
    return {
      totalDeductions,
      amountToDisburse: existingClose ? closeTotals.payout : closeTotals.canDisburse,
    };
  }, [closeTotals, existingClose]);

  const exportData = useMemo(() => {
    if (!existingClose && !sliderNetRow) return [];

    return [
      {
        item: "Rent Collected",
        amount: closeTotals.gross,
        notes: "Rent received during the selected period",
      },
      {
        item: "Commission",
        amount: closeTotals.commission,
        notes: "Agency commission deducted from collection",
      },
      {
        item: "Maintenance",
        amount: closeTotals.maintenance,
        notes: "Maintenance deductions in this period",
      },
      {
        item: "Owner Advances",
        amount: closeTotals.advances,
        notes: "Advances deducted from owner payout",
      },
      {
        item: "Total Deductions",
        amount: disbursementOverview.totalDeductions,
        notes: "Commission, maintenance, and advances",
      },
      {
        item: "Amount To Disburse",
        amount: disbursementOverview.amountToDisburse,
        notes: "Net amount payable to owner",
      },
    ];
  }, [closeTotals, disbursementOverview, existingClose, sliderNetRow]);

  const pdfSections = useMemo(
    () => [
      {
        title: "Collection And Disbursement Breakdown",
        data: exportData,
        columns: breakdownColumns,
      },
    ],
    [exportData],
  );

  const isFutureOrCurrentMonth = disburseMonth > lastCloseableMonth;
  const hasCollection = closeTotals.gross > 0;
  const canReleaseDisbursement =
    Boolean(propertyId) &&
    !existingClose &&
    !isFutureOrCurrentMonth &&
    hasCollection &&
    Boolean(payoutMode) &&
    Boolean(reference.trim());
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
  const canDownloadSettlement =
    canExport &&
    exportData.length > 0 &&
    propertyId &&
    payoutMode &&
    reference.trim();
  const pdfMetadata = {
    Period: closeRange.label,
    Property: selectedProperty?.name || "All Properties",
    "Paid By": payoutModes.find((mode) => mode.value === payoutMode)?.label || "-",
    "Payment Ref": reference.trim() || "-",
    "Tenants": propertyTenantCount,
    Generated: new Date().toLocaleDateString("en-KE"),
  };

  useEffect(() => {
    if (!existingClose) {
      setPayoutMode("");
      setReference("");
      setNotes("");
      return;
    }
    setPayoutMode(existingClose.payout_mode || "");
    setReference(existingClose.payout_reference || "");
    setNotes(existingClose.notes || "");
  }, [existingClose]);

  const sendOwnerBrief = useCallback(async (row) => {
    const property = propertiesById[row.property_id] || {};
    const phone = row.owner_phone || property.owner_phone;
    if (!phone) {
      showToast.error("Add an owner phone on the property first.");
      return false;
    }
    const message = buildOwnerDisbursementSms({
      ownerName: row.owner_name || property.owner_name,
      propertyName: row.property_name || property.name,
      closeMonth: row.close_month,
      gross: row.gross_collection,
      commissionAmount: row.commission_amount,
      commissionRate:
        row.commission_rate ?? property.commission_rate ?? 0,
      maintenance: row.maintenance_amount,
      advances: row.advances_amount,
      payout: row.owner_payout,
    });
    try {
      await apiFetch("/sms/owner-brief", {
        method: "POST",
        body: {
          messages: [{ phoneNumber: phone, message }],
        },
      });
      showToast.success("Collection brief SMS sent to owner.");
      return true;
    } catch (err) {
      console.error(err);
      showToast.error(err?.message || "Failed to send owner SMS.");
      return false;
    }
  }, [propertiesById]);

  const clampViewMonth = (value) => {
    const next = /^\d{4}-\d{2}$/.test(value || "") ? value : lastCloseableMonth;
    return next > currentMonth ? currentMonth : next;
  };

  const clampCloseMonth = (value) => {
    const next = /^\d{4}-\d{2}$/.test(value || "") ? value : lastCloseableMonth;
    return next > lastCloseableMonth ? lastCloseableMonth : next;
  };

  const handleOpenDisbursement = () => {
    setDisburseMonth(lastCloseableMonth);
    setSliderNetRow(null);
    setConfirmRelease(false);
    setActiveModal("close");
  };

  const requestRelease = () => {
    if (existingClose) {
      showToast.error("This month has already been disbursed and cannot be amended.");
      return;
    }
    if (!propertyId) {
      showToast.error("Choose a property before disbursing.");
      return;
    }
    if (isFutureOrCurrentMonth) {
      showToast.error("You can only disburse after the month has ended.");
      return;
    }
    if (!hasCollection) {
      showToast.error("Nothing has been collected for this month yet.");
      return;
    }
    if (!payoutMode) {
      showToast.error("Choose how the owner will be paid.");
      return;
    }
    if (!reference.trim()) {
      showToast.error("Enter the payment reference.");
      return;
    }
    setConfirmRelease(true);
  };

  const handleSaveClose = async () => {
    if (!canReleaseDisbursement) return;

    setSavingClose(true);
    const payload = {
      property_id: propertyId,
      close_month: `${disburseMonth}-01`,
      gross_collection: closeTotals.gross,
      commission_amount: closeTotals.commission,
      maintenance_amount: closeTotals.maintenance,
      advances_amount: closeTotals.advances,
      owner_payout: existingClose ? closeTotals.payout : closeTotals.canDisburse,
      payout_mode: payoutMode,
      payout_reference: reference.trim(),
      notes: notes.trim() || null,
      closed_at: new Date().toISOString(),
    };

    try {
      await OwnerSettlements.create(payload);
      showToast.success("Funds disbursed.");
      const property = propertiesById[propertyId] || selectedProperty || {};
      if (property.owner_phone) {
        await sendOwnerBrief({
          ...payload,
          property_id: propertyId,
          property_name: property.name,
          owner_name: property.owner_name,
          owner_phone: property.owner_phone,
          commission_rate: property.commission_rate,
        });
      }
      await loadData();
      setConfirmRelease(false);
      setActiveTab("close");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast.error(err?.message || "Failed to disburse funds.");
    } finally {
      setSavingClose(false);
    }
  };

  const advanceColumns = useMemo(
    () =>
      buildAdvanceColumns({
        onEdit: canEditAdvances
          ? (row) => {
              setEditTarget(row);
              setActiveModal("advance");
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
            className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
            Refresh
          </button>
          {canCreateAdvances && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setActiveModal("advance");
              }}
              className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Add Advance
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-4">
        <StatCard label="Expected rent" value={formatCurrency(totals.expected)} />
        <StatCard label="Collected" value={formatCurrency(totals.collected)} />
        <StatCard
          label="Expected to owner"
          value={formatCurrency(totals.expectedPayout)}
          accent="text-black/70"
        />
        <StatCard
          label="Can disburse"
          value={formatCurrency(totals.canDisburse)}
          accent="text-green-700"
        />
      </div>

      <div className="flex flex-col gap-3 border border-stone-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
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
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
              className="w-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
              className="w-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
          <label className="col-span-2 block md:col-span-1">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              Property
            </span>
            <select
              value={filterPropertyId}
              onChange={(event) => setFilterPropertyId(event.target.value)}
              className="w-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleOpenDisbursement}
          className="inline-flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80"
        >
          <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
          Disburse funds
        </button>
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
          onResendSms={sendOwnerBrief}
          canResendSms={canExport}
        />
      )}

      {activeTab === "advances" && (
        <DataTable
          columns={advanceColumns}
          data={filteredAdvances}
          customStyles={maintenanceTableStyles}
          pagination
          progressPending={loading}
          noDataComponent={<div className="py-10 text-center text-sm text-black/45">No owner advances in this period.</div>}
          responsive
          striped
          highlightOnHover
        />
      )}

      {activeTab === "deductions" && (
        <DataTable
          columns={deductionColumns}
          data={deductionRows}
          customStyles={editorialTableStyles}
          pagination
          progressPending={loading}
          noDataComponent={<div className="py-10 text-center text-sm text-black/45">No deductions in this period.</div>}
          responsive
          striped
          highlightOnHover
        />
      )}

      <ModalSlider
        isOpen={activeModal === "advance" && (editTarget ? canEditAdvances : canCreateAdvances)}
        onClose={() => {
          setActiveModal(null);
          setEditTarget(null);
        }}
        title={editTarget ? "Edit Owner Advance" : "Add Owner Advance"}
      >
        <AdvanceForm
          key={editTarget?.id ?? "new_advance"}
          initialData={editTarget}
          onSuccess={() => {
            setActiveModal(null);
            setEditTarget(null);
            showToast.success(editTarget ? "Advance updated." : "Advance added.");
            loadData();
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={activeModal === "close"}
        onClose={() => {
          setConfirmRelease(false);
          setActiveModal(null);
        }}
        title="Monthly Disbursement"
      >
        <div className="space-y-5">
          <div>
            <p className="section-label">— Owner Payment —</p>
            <h2
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Disburse funds
            </h2>
            <p className="mt-1 text-sm text-black/55">
              Capture commission, repairs, and advances first. Once released, this month cannot be amended.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                Month
              </span>
              <input
                type="month"
                max={lastCloseableMonth}
                value={disburseMonth}
                onChange={(event) =>
                  setDisburseMonth(clampCloseMonth(event.target.value || lastCloseableMonth))
                }
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                Property
              </span>
              <select
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              >
                <option value="">Select Property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                How to pay
              </span>
              <select
                value={payoutMode}
                disabled={Boolean(existingClose)}
                onChange={(event) => setPayoutMode(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-50 disabled:text-black/50"
              >
                {payoutModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                Payment ref
              </span>
              <input
                type="text"
                value={reference}
                disabled={Boolean(existingClose)}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction number, cheque number, or note"
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-50 disabled:text-black/50"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Notes
            </span>
            <textarea
              value={notes}
              disabled={Boolean(existingClose)}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes"
              rows={3}
              className="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-50 disabled:text-black/50"
            />
          </label>

          <DisbursementOverview
            totals={closeTotals}
            overview={disbursementOverview}
          />

          {!propertyId && (
            <p className="border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-black/55">
              Choose a property to load rent paid this month. Figures stay at zero until then.
            </p>
          )}
          {existingClose && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {closeRange.label} is already disbursed for this property. No further amendments are allowed.
            </p>
          )}
          {propertyId && !existingClose && !hasCollection && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No rent has been paid for {closeRange.label} yet, so funds cannot be disbursed.
            </p>
          )}
          {!canDownloadSettlement && canExport && exportData.length > 0 && (
            <p className="text-xs text-amber-700">
              Select a property, payment method, and reference before generating the disbursement PDF.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
            {canDownloadSettlement ? (
              <DownloadPDFButton
                fileName={`owner-disbursement-${disburseMonth}`}
                title="Owner Disbursement Report"
                data={exportData}
                columns={breakdownColumns}
                metadata={pdfMetadata}
                sections={pdfSections}
                label="Generate PDF"
              />
            ) : (
              <button
                type="button"
                disabled
                className="bg-blue-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white opacity-45"
              >
                Generate PDF
              </button>
            )}
            <button
              type="button"
              onClick={requestRelease}
              disabled={!canReleaseDisbursement || savingClose}
              className="bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80 disabled:opacity-45"
            >
              {existingClose ? "Already disbursed" : "Disburse funds"}
            </button>
          </div>
        </div>
      </ModalSlider>

      {confirmRelease ? (
        <DisburseConfirmDialog
          monthLabel={closeRange.label}
          propertyName={selectedProperty?.name || "this property"}
          amount={existingClose ? closeTotals.payout : closeTotals.canDisburse}
          saving={savingClose}
          onCancel={() => setConfirmRelease(false)}
          onConfirm={handleSaveClose}
        />
      ) : null}
    </div>
  );
}

function DisburseConfirmDialog({
  monthLabel,
  propertyName,
  amount,
  saving,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-amber-500 text-white">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">
                Confirm release
              </p>
              <h3
                className="mt-1 text-xl font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Disburse funds
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2 text-black/55 transition-colors hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-black/70">
            Make sure commission, repairs, and advances for{" "}
            <span className="font-semibold text-black">{propertyName}</span> in{" "}
            <span className="font-semibold text-black">{monthLabel}</span> are
            captured correctly.
          </p>
          <div className="border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              Amount to owner
            </p>
            <p className="mt-1 text-lg font-black tabular-nums text-green-700">
              {formatCurrency(amount)}
            </p>
          </div>
          <p className="text-sm font-medium text-amber-800">
            Once released, this month cannot be amended.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="border border-stone-300 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black/70 hover:bg-stone-50 disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-black/80 disabled:opacity-45"
          >
            {saving ? "Releasing..." : "Okay, release"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/50">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-black tabular-nums leading-tight ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}

function DisbursementOverview({ totals, overview }) {
  return (
    <div className="border border-stone-200 bg-white">
      <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
          Disbursement Overview
        </p>
      </div>
      <div className="divide-y divide-stone-200">
        <OverviewRow
          label="Expected rent"
          value={formatCurrency(totals.expected || 0)}
          note="Billed to registered tenants"
        />
        <OverviewRow
          label="Rent collected"
          value={formatCurrency(totals.gross)}
          note="Rent actually paid this month"
          strong
        />
        <OverviewRow
          label="Expected to owner"
          value={formatCurrency(totals.expectedPayout || 0)}
          note="If all billed rent is paid"
        />
        <OverviewRow
          label="Less Deductions"
          value={formatCurrency(overview.totalDeductions)}
          note="Commission + maintenance + advances"
          strong
        />
        <OverviewRow
          label="Commission"
          value={formatCurrency(totals.commission)}
          depth={1}
          accent="text-blue-700"
        />
        <OverviewRow
          label="Maintenance"
          value={formatCurrency(totals.maintenance)}
          depth={1}
          accent="text-red-700"
        />
        <OverviewRow
          label="Advances"
          value={formatCurrency(totals.advances)}
          depth={1}
          accent="text-amber-700"
        />
        <OverviewRow
          label="Amount To Be Disbursed"
          value={formatCurrency(overview.amountToDisburse)}
          note="Payable from rent collected this period"
          accent="text-green-700"
          final
        />
      </div>
    </div>
  );
}

function OverviewRow({
  label,
  value,
  note = "",
  depth = 0,
  accent = "text-black",
  strong = false,
  final = false,
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-3 px-3 py-2 ${
        final ? "bg-green-50" : ""
      }`}
    >
      <div className={depth ? "pl-4" : ""}>
        <p
          className={`text-[11px] uppercase tracking-[0.16em] ${
            strong || final ? "font-black text-black" : "font-bold text-black/55"
          }`}
        >
          {depth ? "- " : ""}
          {label}
        </p>
        {note ? <p className="mt-0.5 text-xs text-black/45">{note}</p> : null}
      </div>
      <p
        className={`text-right text-sm tabular-nums ${
          strong || final ? "font-black" : "font-bold"
        } ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
