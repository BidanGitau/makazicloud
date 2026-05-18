"use client";

import {
  CATEGORY_LABEL,
  STATUS_STYLE,
  ADVANCE_STATUS_STYLE,
  STATUSES,
} from "./maintenanceConstants";
import { formatCurrency } from "@/app/_lib/formatters";
import EllipsisMenu from "@/app/_components/ElpsisMenu";

// Re-export so legacy imports stay working — the shared editorial style
// is now the single source of truth for every table in the app.
export { editorialTableStyles as maintenanceTableStyles } from "@/app/_components/tableStyles";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

export function buildMaintenanceColumns({ onEdit, onDelete, onStatusChange }) {
  return [
    {
      name: "Property",
      selector: (row) => row.properties?.name || "",
      sortable: true,
      grow: 1,
    },
    {
      name: "Title",
      selector: (row) => row.title,
      sortable: true,
      grow: 1.4,
      wrap: true,
    },
    {
      name: "Category",
      selector: (row) => CATEGORY_LABEL[row.category] || row.category || "—",
      sortable: true,
      width: "140px",
    },
    {
      name: "Fault",
      selector: (row) => row.is_tenant_fault,
      sortable: true,
      width: "110px",
      cell: (row) =>
        row.is_tenant_fault ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            Tenant
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Owner
          </span>
        ),
    },
    {
      name: "Cost",
      selector: (row) => Number(row.actual_cost || 0),
      format: (row) => (row.actual_cost != null ? formatCurrency(row.actual_cost) : "—"),
      sortable: true,
      style: { justifyContent: "flex-end" },
      width: "130px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      width: "160px",
      cell: (row) => (
        onStatusChange ? (
          <select
            value={row.status}
            onChange={(e) => onStatusChange(row.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:ring-1 focus:ring-blue-300 ${
              STATUS_STYLE[row.status] || "bg-gray-100 text-gray-500"
            }`}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              STATUS_STYLE[row.status] || "bg-gray-100 text-gray-500"
            }`}
          >
            {row.status}
          </span>
        )
      ),
    },
    (onEdit || onDelete) && {
      name: "Action",
      width: "110px",
      ignoreRowClick: true,
      style: { justifyContent: "center" },
      cell: (row) => (
        <EllipsisMenu
          items={[
            onEdit && { label: "Edit", onClick: () => onEdit(row) },
            onDelete && {
              label: "Delete",
              destructive: true,
              onClick: () => onDelete(row.id),
            },
          ].filter(Boolean)}
        />
      ),
    },
  ].filter(Boolean);
}

export function buildAdvanceColumns({ onEdit, onDelete }) {
  return [
    {
      name: "Property",
      selector: (row) => row.properties?.name || "",
      sortable: true,
      grow: 1.2,
    },
    {
      name: "Purpose",
      selector: (row) => row.purpose,
      sortable: true,
      grow: 1.5,
      wrap: true,
    },
    {
      name: "Amount",
      selector: (row) => Number(row.amount || 0),
      format: (row) => formatCurrency(row.amount),
      sortable: true,
      style: { justifyContent: "flex-end" },
      width: "120px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      width: "100px",
      cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            ADVANCE_STATUS_STYLE[row.status] || "bg-gray-100 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      name: "Requested",
      selector: (row) => row.requested_date,
      format: (row) => fmtDate(row.requested_date),
      sortable: true,
      width: "110px",
    },
    {
      name: "Linked Maintenance",
      selector: (row) => row.maintenance_requests?.title || "—",
      grow: 1,
      wrap: true,
    },
    (onEdit || onDelete) && {
      name: "",
      width: "100px",
      ignoreRowClick: true,
      cell: (row) => (
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(row)}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(row.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
            >
              Del
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean);
}
