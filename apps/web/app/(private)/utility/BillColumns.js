"use client";

import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { SERVICE_LABEL, billLocationLabel } from "./utilityConstants";

const statusStyle = {
  paid:    "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  unpaid:  "bg-yellow-100 text-yellow-700",
  pending: "bg-yellow-100 text-yellow-700",
};

/**
 * Factory that returns the DataTable columns for the utility bills table.
 * Extracted from page.js so the page component stays lean.
 *
 * @param {{ getProperty, getUnit, onMarkPaid, onDelete }} callbacks
 */
export function buildBillColumns({ onMarkPaid, onDelete }) {
  return [
    {
      name: "Property",
      selector: (row) => row.property_name || "",
      sortable: true,
      grow: 1.2,
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
      name: "Location",
      selector: (row) => row.unit_number || "",
      sortable: true,
      cell: (row) => {
        const label = billLocationLabel(row);
        const isWide = row.assign_all || !row.unit_id;
        return (
          <span className={`text-sm ${isWide ? "text-gray-400 italic" : "text-gray-700 font-medium"}`}>
            {label}
          </span>
        );
      },
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
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            statusStyle[row.status] ?? statusStyle.unpaid
          }`}
        >
          {row.status}
        </span>
      ),
    },
    (onMarkPaid || onDelete) && {
      name: "",
      width: "48px",
      cell: (row) => (
        <EllipsisMenu
          items={[
            onMarkPaid && { label: "Mark Paid", onClick: () => onMarkPaid(row) },
            onDelete && { label: "Delete", onClick: () => onDelete(row.id), destructive: true },
          ].filter(Boolean)}
        />
      ),
    },
  ].filter(Boolean);
}

// Kept as a re-export so existing imports stay working.
export { editorialTableStyles as billTableStyles } from "@/app/_components/tableStyles";
