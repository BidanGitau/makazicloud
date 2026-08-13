"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { ClipboardCheck, Plus, ReceiptText, RefreshCw, Wallet } from "lucide-react";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { formatCurrency } from "@/app/_lib/formatters";
import {
  ArrearDetails,
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

const monthValue = () => new Date().toISOString().slice(0, 7);

const tabs = [
  { id: "close", label: "Disbursement", Icon: ClipboardCheck },
  { id: "summary", label: "History", Icon: ReceiptText },
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

const settlementColumns = [
  {
    name: "Property",
    selector: (row) => row.property_name,
    sortable: true,
    grow: 1.5,
  },
  {
    name: "Rent Collected",
    selector: (row) => Number(row.total_collected || 0),
    format: (row) => formatCurrency(row.total_collected),
    sortable: true,
    right: true,
  },
  {
    name: "Commission",
    selector: (row) => Number(row.commission_amount || 0),
    format: (row) => formatCurrency(row.commission_amount),
    sortable: true,
    right: true,
  },
  {
    name: "Maintenance",
    selector: (row) => Number(row.total_maintenance_cost || 0),
    format: (row) => formatCurrency(row.total_maintenance_cost),
    sortable: true,
    right: true,
  },
  {
    name: "Advances",
    selector: (row) => Number(row.total_advances || 0),
    format: (row) => formatCurrency(row.total_advances),
    sortable: true,
    right: true,
  },
  {
    name: "To Owner",
    selector: (row) => Number(row.net_income || 0),
    format: (row) => formatCurrency(row.net_income),
    sortable: true,
    right: true,
    style: { fontWeight: 700 },
  },
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
    right: true,
    width: "150px",
  },
];

const summaryColumns = [
  {
    name: "Month",
    selector: (row) => row.close_month || "",
    format: (row) => formatMonth(row.close_month),
    sortable: true,
    width: "140px",
  },
  {
    name: "Property",
    selector: (row) => row.property_name || "",
    sortable: true,
    grow: 1.4,
  },
  {
    name: "Gross",
    selector: (row) => Number(row.gross_collection || 0),
    format: (row) => formatCurrency(row.gross_collection),
    sortable: true,
    right: true,
  },
  {
    name: "Deductions",
    selector: (row) =>
      Number(row.commission_amount || 0) +
      Number(row.maintenance_amount || 0) +
      Number(row.advances_amount || 0),
    format: (row) =>
      formatCurrency(
        Number(row.commission_amount || 0) +
          Number(row.maintenance_amount || 0) +
          Number(row.advances_amount || 0),
      ),
    sortable: true,
    right: true,
  },
  {
    name: "To Owner",
    selector: (row) => Number(row.owner_payout || 0),
    format: (row) => formatCurrency(row.owner_payout),
    sortable: true,
    right: true,
    style: { fontWeight: 700 },
  },
  {
    name: "Paid By",
    selector: (row) => row.payout_mode || "",
    sortable: true,
    width: "130px",
  },
  {
    name: "Ref",
    selector: (row) => row.payout_reference || "",
    sortable: true,
    grow: 1,
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

const arrearsExportColumns = [
  { header: "Property", key: "property", width: "32%" },
  { header: "Unit", key: "unit", width: "14%" },
  { header: "Tenant Name", key: "tenant", width: "32%" },
  {
    header: "Amount",
    key: "amount",
    width: "22%",
    render: currencyOrDash,
    excelRender: numberOrBlank,
  },
];

function dateRange(month, endMonth = month) {
  const value = /^\d{4}-\d{2}$/.test(month || "") ? month : monthValue();
  const endValue = /^\d{4}-\d{2}$/.test(endMonth || "") ? endMonth : value;
  const [year, monthIndex] = value.split("-").map(Number);
  const [endYear, endMonthIndex] = endValue.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(endYear, endMonthIndex, 0);
  const normalizedEnd = end < start ? new Date(year, monthIndex, 0) : end;
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: normalizedEnd.toISOString().slice(0, 10),
    label:
      value === endValue || end < start
        ? start.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
        : `${start.toLocaleDateString("en-KE", { month: "short", year: "numeric" })} - ${normalizedEnd.toLocaleDateString("en-KE", { month: "short", year: "numeric" })}`,
  };
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

function arrearsBalance(row) {
  const explicitBalance = Number(row.balance);
  if (Number.isFinite(explicitBalance)) return explicitBalance;
  return Number(row.amount_due || 0) - Number(row.amount_paid || 0);
}

function isOpenArrear(row) {
  return arrearsBalance(row) > 0 && !["paid", "cleared"].includes(String(row.status || "").toLowerCase());
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
  const [propertyId, setPropertyId] = useState("");
  const [payoutMode, setPayoutMode] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [netRows, setNetRows] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingClose, setSavingClose] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const { properties, isLoading: isLoadingProperties } = usePropertyStructure(propertyId, "");
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
        ...(propertyId ? { property_id: propertyId } : {}),
      };
      const [net, ownerAdvances, maintenanceRows, closeRows, arrearsRows, tenantRows] = await Promise.all([
        PropertyNetIncome.getAll({ match }),
        OwnerAdvances.getWithDetails({ propertyId }),
        Maintenance.getWithDetails({ propertyId }),
        OwnerSettlements.getAll({
          order: { column: "close_month", ascending: false },
        }),
        ArrearDetails.getAllPages({
          order: { column: "month", ascending: true },
        }),
        TenantOverview.getAllPages({
          ...(propertyId ? { match: { property_id: propertyId } } : {}),
          order: { column: "full_name", ascending: true },
        }),
      ]);
      setNetRows(net || []);
      setAdvances(ownerAdvances || []);
      setMaintenance(maintenanceRows || []);
      setSettlements(closeRows || []);
      setArrears(arrearsRows || []);
      setTenants(tenantRows || []);
    } catch (err) {
      console.error(err);
      showToast.error("Failed to load owner disbursement data.");
    } finally {
      setLoading(false);
    }
  }, [propertyId, range.endDate, range.startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAdvances = useMemo(
    () =>
      advances.filter(
        (row) =>
          row.status !== "cancelled" &&
          withinRange(row.advance_date || row.requested_date, range.startDate, range.endDate),
      ),
    [advances, range.endDate, range.startDate],
  );

  const deductionRows = useMemo(() => {
    const maintenanceDeductions = maintenance
      .filter((row) => withinRange(row.reported_date || row.created_at, range.startDate, range.endDate))
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
  }, [filteredAdvances, maintenance, range.endDate, range.startDate]);

  const openArrears = useMemo(
    () =>
      arrears
        .filter(isOpenArrear)
        .filter((row) => !propertyId || row.property_id === propertyId)
        .sort((a, b) => {
          const propertyCompare = String(a.property_name || "").localeCompare(
            String(b.property_name || ""),
          );
          if (propertyCompare) return propertyCompare;
          const unitCompare = String(a.unit_number || "").localeCompare(
            String(b.unit_number || ""),
            undefined,
            { numeric: true },
          );
          if (unitCompare) return unitCompare;
          return String(a.tenant_name || "").localeCompare(String(b.tenant_name || ""));
        }),
    [arrears, propertyId],
  );

  const arrearsTotals = useMemo(
    () =>
      openArrears.reduce(
        (acc, row) => {
          acc.amount += arrearsBalance(row);
          acc.tenants.add(row.tenant_id || row.tenant_name || row.id);
          acc.units.add(row.unit_id || row.unit_number || row.id);
          return acc;
        },
        { amount: 0, tenants: new Set(), units: new Set() },
      ),
    [openArrears],
  );

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
      netRows.reduce(
        (acc, row) => ({
          gross: acc.gross + Number(row.total_collected || 0),
          commission: acc.commission + Number(row.commission_amount || 0),
          maintenance: acc.maintenance + Number(row.total_maintenance_cost || 0),
          advances: acc.advances + Number(row.total_advances || 0),
          payout: acc.payout + Number(row.net_income || 0),
        }),
        { gross: 0, commission: 0, maintenance: 0, advances: 0, payout: 0 },
      ),
    [netRows],
  );

  const selectedProperty = properties.find((property) => property.id === propertyId);
  const propertiesById = useMemo(
    () => Object.fromEntries(properties.map((property) => [property.id, property])),
    [properties],
  );
  const selectedCloseRow = useMemo(
    () => netRows.find((row) => row.property_id === propertyId) || null,
    [netRows, propertyId],
  );
  const closeTotals = useMemo(
    () =>
      selectedCloseRow
        ? {
            gross: Number(selectedCloseRow.total_collected || 0),
            commission: Number(selectedCloseRow.commission_amount || 0),
            maintenance: Number(selectedCloseRow.total_maintenance_cost || 0),
            advances: Number(selectedCloseRow.total_advances || 0),
            payout: Number(selectedCloseRow.net_income || 0),
          }
        : totals,
    [selectedCloseRow, totals],
  );

  const disbursementOverview = useMemo(() => {
    const totalDeductions =
      closeTotals.commission + closeTotals.maintenance + closeTotals.advances;
    return {
      expectedCollection: closeTotals.gross + arrearsTotals.amount,
      arrears: arrearsTotals.amount,
      arrearsTenants: arrearsTotals.tenants.size,
      totalDeductions,
      amountToDisburse: closeTotals.payout,
    };
  }, [arrearsTotals, closeTotals]);

  const exportData = useMemo(() => {
    if (!netRows.length && !openArrears.length) return [];

    return [
      {
        item: "Expected Collection",
        amount: disbursementOverview.expectedCollection,
        notes: "Actual rent collected plus outstanding arrears",
      },
      {
        item: "Actual Collected",
        amount: closeTotals.gross,
        notes: "Rent received during the selected period",
      },
      {
        item: "Arrears Outstanding",
        amount: arrearsTotals.amount,
        notes: `${arrearsTotals.tenants.size} tenant${arrearsTotals.tenants.size === 1 ? "" : "s"} in arrears`,
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
  }, [arrearsTotals, closeTotals, disbursementOverview, netRows.length, openArrears.length]);

  const arrearsExportData = useMemo(
    () =>
      openArrears.map((row) => ({
        property: row.property_name || "N/A",
        unit: row.unit_number || "N/A",
        tenant: row.tenant_name || "Unknown",
        amount: arrearsBalance(row),
      })),
    [openArrears],
  );

  const pdfSections = useMemo(
    () => [
      {
        title: "Collection And Disbursement Breakdown",
        data: exportData,
        columns: breakdownColumns,
      },
      {
        title: "Arrears",
        data: arrearsExportData.length
          ? arrearsExportData
          : [{ property: "-", unit: "-", tenant: "No arrears", amount: null }],
        columns: arrearsExportColumns,
      },
    ],
    [arrearsExportData, exportData],
  );

  const existingClose = useMemo(
    () =>
      settlements.find(
        (row) =>
          row.property_id === propertyId &&
          String(row.close_month || "").startsWith(`${selectedMonth}-01`),
      ) || null,
    [propertyId, selectedMonth, settlements],
  );
  const summaryRows = useMemo(
    () =>
      settlements.map((row) => ({
        ...row,
        property_name:
          propertiesById[row.property_id]?.name || row.property_name || "Unknown Property",
      })),
    [propertiesById, settlements],
  );
  const canDownloadSettlement =
    canExport &&
    exportData.length > 0 &&
    propertyId &&
    payoutMode &&
    reference.trim();
  const pdfMetadata = {
    Period: range.label,
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

  const handleSaveClose = async () => {
    if (!propertyId) {
      showToast.error("Choose a property before saving the disbursement.");
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

    setSavingClose(true);
    const payload = {
      property_id: propertyId,
      close_month: `${selectedMonth}-01`,
      gross_collection: closeTotals.gross,
      commission_amount: closeTotals.commission,
      maintenance_amount: closeTotals.maintenance,
      advances_amount: closeTotals.advances,
      owner_payout: closeTotals.payout,
      payout_mode: payoutMode,
      payout_reference: reference.trim(),
      notes: notes.trim() || null,
      closed_at: new Date().toISOString(),
    };

    try {
      if (existingClose?.id) {
        await OwnerSettlements.update(existingClose.id, payload);
        showToast.success("Disbursement updated.");
      } else {
        await OwnerSettlements.create(payload);
        showToast.success("Disbursement saved.");
      }
      await loadData();
      setActiveTab("summary");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      showToast.error(err?.message || "Failed to save disbursement.");
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
    return <PageSkeleton cards={5} hasFilters />;
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

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-5">
        <StatCard label="Rent Collected" value={formatCurrency(totals.gross)} />
        <StatCard label="Commission" value={formatCurrency(totals.commission)} accent="text-blue-700" />
        <StatCard label="Maintenance" value={formatCurrency(totals.maintenance)} accent="text-red-700" />
        <StatCard label="Advances" value={formatCurrency(totals.advances)} accent="text-amber-700" />
        <StatCard label="To Owner" value={formatCurrency(totals.payout)} accent="text-green-700" />
      </div>

      <div className="flex flex-col gap-3 border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Month-on-month Disbursement
          </p>
          <p className="mt-1 text-sm font-semibold text-black">
            {range.label} · {selectedProperty?.name || "Select a property"}
          </p>
          <p className="mt-1 text-xs text-black/45">
            Owner gets: {formatCurrency(closeTotals.payout)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              From
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                const value = event.target.value || monthValue();
                setSelectedMonth(value);
                if (selectedEndMonth < value) setSelectedEndMonth(value);
              }}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              To
            </span>
            <input
              type="month"
              value={selectedEndMonth}
              onChange={(event) => setSelectedEndMonth(event.target.value || selectedMonth)}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal("close")}
          className="inline-flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80"
        >
          <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
          Open Disbursement
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
        <DataTable
          columns={settlementColumns}
          data={netRows}
          customStyles={editorialTableStyles}
          pagination
          progressPending={loading}
          noDataComponent={<div className="py-10 text-center text-sm text-black/45">No disbursement data found.</div>}
          responsive
          striped
          highlightOnHover
        />
      )}

      {activeTab === "summary" && (
        <DataTable
          columns={summaryColumns}
          data={summaryRows}
          customStyles={editorialTableStyles}
          pagination
          progressPending={loading}
          noDataComponent={<div className="py-10 text-center text-sm text-black/45">No disbursements saved yet.</div>}
          responsive
          striped
          highlightOnHover
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
        onClose={() => setActiveModal(null)}
        title="Monthly Disbursement"
      >
        <div className="space-y-5">
          <div>
            <p className="section-label">— Owner Payment —</p>
            <h2
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Set up disbursement
            </h2>
            <p className="mt-1 text-sm text-black/55">
              Save one disbursement per property each month. Existing records for the same month and property will be updated.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                From month
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  const value = event.target.value || monthValue();
                  setSelectedMonth(value);
                  if (selectedEndMonth < value) setSelectedEndMonth(value);
                }}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                To month
              </span>
              <input
                type="month"
                value={selectedEndMonth}
                onChange={(event) => setSelectedEndMonth(event.target.value || selectedMonth)}
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
                onChange={(event) => setPayoutMode(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction number, cheque number, or note"
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes"
              rows={3}
              className="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>

          <DisbursementOverview
            totals={closeTotals}
            overview={disbursementOverview}
          />

          {existingClose && (
            <p className="text-xs text-green-700">
              This property already has a disbursement for {range.label}. Saving will update it.
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
                fileName={`owner-disbursement-${selectedMonth}`}
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
              onClick={handleSaveClose}
              disabled={savingClose || !propertyId || !payoutMode || !reference.trim()}
              className="bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80 disabled:opacity-45"
            >
              {savingClose
                ? "Saving..."
                : existingClose
                  ? "Update Disbursement"
                  : "Save Disbursement"}
            </button>
          </div>
        </div>
      </ModalSlider>
    </div>
  );
}

function StatCard({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${accent}`}
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
          label="Expected Collection"
          value={formatCurrency(overview.expectedCollection)}
          note="Rent collected + arrears"
          strong
        />
        <OverviewRow
          label="Rent Collected"
          value={formatCurrency(totals.gross)}
          depth={1}
        />
        <OverviewRow
          label="Arrears Outstanding"
          value={formatCurrency(overview.arrears)}
          note={`${overview.arrearsTenants} tenant${overview.arrearsTenants === 1 ? "" : "s"}`}
          depth={1}
          accent="text-amber-700"
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
          note="Net amount payable to owner"
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
