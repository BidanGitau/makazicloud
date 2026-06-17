"use client";

import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { SERVICE_LABEL, billLocationLabel } from "./utilityConstants";

const statusStyle = {
  paid:    "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  unpaid:  "bg-yellow-100 text-yellow-700",
  pending: "bg-yellow-100 text-yellow-700",
};


export function buildBillColumns({ onMarkPaid, onDelete, showPropertyUnit = true }) {
  return [
    showPropertyUnit
      ? {
      name: "Property / Unit",
      selector: (row) =>
        `${row.property_name || ""} ${row.block_name || ""} ${row.unit_number || ""}`,
      sortable: true,
      grow: 1.5,
      cell: (row) => <PropertyUnitCell row={row} />,
    }
      : {
          name: "Unit",
          selector: (row) => row.unit_number || "",
          sortable: true,
          grow: 1,
          cell: (row) => <UnitCell row={row} />,
        },
    {
      name: "Bill",
      selector: (row) => row.name,
      sortable: true,
      grow: 1.5,
      cell: (row) => (
        <div>
          <div className="font-medium text-sm">{row.name}</div>
          {row.service_type && (
            <div className="text-xs text-gray-400">
              {SERVICE_LABEL[row.service_type] ?? row.service_type}
            </div>
          )}
          {row.payment_mode && (
            <div className="text-xs text-blue-600">
              {row.payment_mode}
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Month",
      selector: (row) => row.billing_month || "",
      sortable: true,
      cell: (row) =>
        row.billing_month
          ? new Date(row.billing_month).toLocaleDateString("en-KE", {
              year: "numeric",
              month: "short",
            })
          : "–",
    },
    {
      name: "Amount (KSh)",
      selector: (row) => Number(row.total_amount || 0),
      sortable: true,
      style: { justifyContent: "flex-end" },
      cell: (row) => (
        <span className="font-semibold text-sm">
          {Number(row.total_amount || 0).toLocaleString("en-KE")}
        </span>
      ),
    },
    {
      name: "Paid (KSh)",
      selector: (row) => Number(row.paid_amount || 0),
      style: { justifyContent: "flex-end" },
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {Number(row.paid_amount || 0).toLocaleString("en-KE")}
        </span>
      ),
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        row.isSummary ? null : (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusStyle[row.status] ?? statusStyle.unpaid
          }`}
        >
          {row.status}
        </span>
        )
      ),
    },
    (onMarkPaid || onDelete) && {
      name: "",
      width: "48px",
      cell: (row) => (
        row.isSummary ? null : (
        <EllipsisMenu
          items={[
            onMarkPaid && { label: "Mark Paid", onClick: () => onMarkPaid(row) },
            onDelete && { label: "Delete", onClick: () => onDelete(row.id), destructive: true },
          ].filter(Boolean)}
        />
        )
      ),
    },
  ].filter(Boolean);
}

function PropertyUnitCell({ row }) {
  const location = billLocationLabel(row);
  const hasUnit = !!row.unit_number;
  const blockPrefix = row.block_name ? `${row.block_name} - ` : "";
  const unitLabel = hasUnit
    ? `${blockPrefix}Unit ${row.unit_number}`
    : location;

  return (
    <div className="py-2">
      <p className="font-semibold text-black">
        {row.property_name || "Unknown Property"}
      </p>
      {unitLabel && (
        <p
          className={`mt-0.5 text-xs ${
            hasUnit ? "font-medium text-black/60" : "italic text-black/40"
          }`}
        >
          {unitLabel}
        </p>
      )}
    </div>
  );
}

function UnitCell({ row }) {
  const location = billLocationLabel(row);
  const hasUnit = !!row.unit_number;
  const unitLabel = hasUnit ? `Unit ${row.unit_number}` : location;

  return (
    <div className="py-2">
      {unitLabel ? (
        <p
          className={`text-sm ${
            hasUnit ? "font-semibold text-black" : "italic text-black/40"
          }`}
        >
          {unitLabel}
        </p>
      ) : (
        <span className="text-black/35">—</span>
      )}
      {row.block_name && hasUnit && (
        <p className="mt-0.5 text-xs text-black/45">{row.block_name}</p>
      )}
    </div>
  );
}


export { editorialTableStyles as billTableStyles } from "@/app/_components/tableStyles";
