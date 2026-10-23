import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { formatCurrency, formatShortDate } from "@/app/_lib/formatters";

export function buildDeductionColumns({ onEditAdvance, onStatusChange } = {}) {
  return [
    {
      name: "Type",
      selector: (row) => row.type,
      sortable: true,
      width: "140px",
    },
    {
      name: "Description",
      selector: (row) => row.description,
      grow: 2,
      wrap: true,
    },
    {
      name: "Date",
      selector: (row) => row.date,
      format: (row) => formatShortDate(row.date),
      sortable: true,
      width: "130px",
    },
    {
      name: "Amount",
      selector: (row) => Number(row.amount || 0),
      format: (row) => formatCurrency(row.amount),
      sortable: true,
      style: { justifyContent: "flex-end" },
      width: "140px",
    },
    (onEditAdvance || onStatusChange) && {
      name: "",
      width: "48px",
      ignoreRowClick: true,
      cell: (row) => {
        if (row.kind !== "advance" || !row.source) return null;
        return (
          <EllipsisMenu
            menuId={row.id}
            items={[
              onEditAdvance && {
                label: "Edit",
                onClick: () => onEditAdvance(row.source),
              },
              onStatusChange &&
                row.source.status === "cancelled" && {
                  label: "Mark disbursed",
                  onClick: () => onStatusChange(row.source.id, "disbursed"),
                },
              onStatusChange &&
                row.source.status !== "cancelled" && {
                  label: "Cancel advance",
                  destructive: true,
                  onClick: () => onStatusChange(row.source.id, "cancelled"),
                },
            ].filter(Boolean)}
          />
        );
      },
    },
  ].filter(Boolean);
}
