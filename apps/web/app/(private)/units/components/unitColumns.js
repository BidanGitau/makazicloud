import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { formatCurrency } from "@/app/_lib/formatters";
import { isVacantUnit } from "../utils/unitFilters";

export function buildUnitColumns({
  canEdit,
  canDelete,
  canCreateTenant,
  onAssign,
  onEdit,
  onAdjustRent,
  onDelete,
}) {
  return [
    {
      name: "Unit #",
      selector: (row) => row.unit_number,
      cell: (row) => {
        if (row.isSummary) {
          return (
            <span className="font-semibold text-black">
              Total Units: {row.total_units}
            </span>
          );
        }
        const value = row.unit_number;
        const unitNumber =
          typeof value === "string" && value
            ? value[0].toUpperCase() + value.slice(1)
            : value || "-";
        return (
          <div className="py-0.5">
            <p className="text-xs font-semibold text-black">#{unitNumber}</p>
            <p className="text-[11px] text-black/55">{row.type || "Unit"}</p>
          </div>
        );
      },
      sortable: true,
      grow: 2,
    },
    {
      name: "Type",
      selector: (row) => row.type || "-",
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span className="text-black/70">{row.type || "-"}</span>
        ),
      sortable: true,
    },
    {
      name: "Floor",
      selector: (row) => row.floor ?? "-",
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span className="text-black/70">{row.floor ?? "-"}</span>
        ),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span
            className={
              String(row.status).toLowerCase() === "occupied"
                ? "border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-green-700"
                : "border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-700"
            }
          >
            {String(row.status || "vacant").toLowerCase()}
          </span>
        ),
      sortable: true,
    },
    {
      name: "Rent",
      selector: (row) => row.rent_amount,
      cell: (row) =>
        row.isSummary ? (
          <span className="font-mono font-semibold tabular-nums text-black">
            {formatCurrency(row.rent_amount)}
          </span>
        ) : row.rent_amount ? (
          <span className="font-mono font-semibold tabular-nums text-black">
            {formatCurrency(row.rent_amount)}
          </span>
        ) : (
          "-"
        ),
      sortable: true,
      width: "112px",
    },
    (canEdit || canDelete || canCreateTenant) && {
      name: "Actions",
      cell: (row) =>
        row.isSummary ? null : (
          <EllipsisMenu
            items={[
              canCreateTenant &&
                isVacantUnit(row) && {
                  label: "Assign Unit",
                  onClick: () => onAssign(row),
                },
              canEdit && { label: "Edit", onClick: () => onEdit(row) },
              canEdit && {
                label: "Rent Adjustment",
                onClick: () => onAdjustRent(row),
              },
              canDelete && {
                label: "Delete",
                onClick: () => onDelete(row.id),
                destructive: true,
              },
            ].filter(Boolean)}
          />
        ),
      width: "64px",
    },
  ].filter(Boolean);
}
