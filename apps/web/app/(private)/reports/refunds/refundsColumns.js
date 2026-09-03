"use client";

import { formatCurrency } from "@/app/_lib/formatters";
import EllipsisMenu from "@/app/_components/ElpsisMenu";

const STATUS_STYLE = {
  pending: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  processed: "border border-green-200 bg-green-50 text-green-700",
  cancelled: "border border-stone-200 bg-stone-50 text-black/55",
};

const isInactiveTenant = (row) =>
  String(row?.tenant_status || "").toLowerCase() === "inactive";


export function buildColumns({ onProcess, onCancel }) {
  return [
    {
      name: "Tenant",
      selector: (r) => r.tenant_name,
      sortable: true,
      grow: 1.4,
      cell: (r) => (
        <div className="w-full py-1">
          <div className="font-semibold text-black">{r.tenant_name}</div>
          {r.lease_start && (
            <div className="text-[10px] uppercase tracking-[0.16em] text-black/45">
              Since {new Date(r.lease_start).getFullYear()}
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Property / Unit",
      selector: (r) => `${r.property_name || ""} ${r.unit_number || ""}`,
      sortable: true,
      grow: 1.4,
      cell: (r) => (
        <div className="w-full py-1">
          <div className="font-medium text-black">{r.property_name || "—"}</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-black/45">
            {r.unit_number ? `Unit ${r.unit_number}` : "—"}
          </div>
        </div>
      ),
    },
    {
      name: "Deposit",
      selector: (r) => Number(r.total_deposit || 0),
      format: (r) => formatCurrency(r.total_deposit),
      sortable: true,
      right: true,
      width: "130px",
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Deductions",
      selector: (r) => Number(r.deductions || 0),
      sortable: true,
      right: true,
      width: "140px",
      style: { justifyContent: "flex-end" },
      cell: (r) => (
        <div className="w-full text-right font-semibold tabular-nums text-amber-700">
          {formatCurrency(r.deductions)}
        </div>
      ),
    },
    {
      name: "Net Refund",
      selector: (r) => Number(r.net_refund || 0),
      sortable: true,
      right: true,
      width: "140px",
      style: { justifyContent: "flex-end" },
      cell: (r) => (
        <div className="w-full text-right font-semibold tabular-nums text-green-700">
          {formatCurrency(r.net_refund)}
        </div>
      ),
    },
    {
      name: "Outstanding",
      selector: (r) => Number(r.outstanding_refund || 0),
      sortable: true,
      right: true,
      width: "140px",
      style: { justifyContent: "flex-end" },
      cell: (r) => (
        <div
          className={`w-full text-right tabular-nums ${
            r.outstanding_refund > 0
              ? "font-semibold text-red-600"
              : "text-black/55"
          }`}
        >
          {formatCurrency(r.outstanding_refund)}
        </div>
      ),
    },
    {
      name: "Status",
      selector: (r) => r.status,
      sortable: true,
      width: "130px",
      style: { justifyContent: "flex-start" },
      cell: (r) => (
        <span
          className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
            STATUS_STYLE[r.status] || STATUS_STYLE.cancelled
          }`}
        >
          {r.status}
        </span>
      ),
    },
    (onProcess || onCancel) && {
      name: "Action",
      width: "90px",
      ignoreRowClick: true,
      right: true,
      style: { justifyContent: "flex-end" },
      cell: (r) => {
        if (!isInactiveTenant(r)) return null;

        const items = [];
        if (onProcess && r.status !== "processed") {
          items.push({
            label: "Process refund",
            onClick: () => onProcess(r),
          });
        }
        if (onCancel && r.status !== "cancelled") {
          items.push({
            label: "Cancel",
            destructive: true,
            onClick: () => onCancel(r),
          });
        }
        return items.length ? (
          <div className="flex w-full justify-end">
            <EllipsisMenu items={items} />
          </div>
        ) : null;
      },
    },
  ].filter(Boolean);
}

export const exportColumns = [
  { header: "Tenant", key: "tenant", width: "18%" },
  { header: "Property", key: "property", width: "14%" },
  { header: "Unit", key: "unit", width: "9%" },
  { header: "Deposit (KSh)", key: "deposit", type: "currency", width: "12%" },
  { header: "Arrears (KSh)", key: "arrears", type: "currency", width: "11%" },
  { header: "Repairs (KSh)", key: "repairs", type: "currency", width: "11%" },
  { header: "Net Refund (KSh)", key: "net_refund", type: "currency", width: "13%" },
  { header: "Status", key: "status", width: "12%" },
];
