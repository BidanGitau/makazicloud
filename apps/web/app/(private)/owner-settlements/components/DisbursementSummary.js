"use client";

import EllipsisMenu from "@/app/_components/ElpsisMenu";
import OwnerPropertyAccordion, { NestedRows } from "@/app/_components/OwnerPropertyAccordion";
import { formatCurrency } from "@/app/_lib/formatters";
import { formatMonthLabel } from "../ownerDisbursementSms";
import { groupPropertyGroupsByOwner, otherCostsAmount } from "../utils/settlementMath";

export default function DisbursementSummary({ rows, loading, onResendSms, canResendSms }) {
  const ownerRows = groupPropertyGroupsByOwner(rows);
  const monthColumns = [
    {
      name: "Month",
      selector: (row) => formatMonthLabel(row.close_month),
      grow: 1.2,
    },
    {
      name: "Collected",
      selector: (row) => Number(row.gross_collection || 0),
      format: (row) => formatCurrency(row.gross_collection),
      style: { justifyContent: "flex-end" },
      width: "120px",
    },
    {
      name: "Commission",
      selector: (row) => Number(row.commission_amount || 0),
      format: (row) => formatCurrency(row.commission_amount),
      style: { justifyContent: "flex-end" },
      width: "120px",
    },
    {
      name: "Other costs",
      selector: (row) => otherCostsAmount(row),
      format: (row) => formatCurrency(otherCostsAmount(row)),
      style: { justifyContent: "flex-end" },
      width: "120px",
    },
    {
      name: "Disbursed",
      selector: (row) => Number(row.owner_payout || 0),
      format: (row) => formatCurrency(row.owner_payout),
      style: { justifyContent: "flex-end" },
      width: "120px",
    },
    canResendSms && {
      name: "",
      width: "48px",
      ignoreRowClick: true,
      cell: (row) => (
        <EllipsisMenu
          menuId={`disburse-${row.id}`}
          items={[
            {
              label: "Resend SMS brief",
              onClick: () => onResendSms?.(row),
            },
          ]}
        />
      ),
    },
  ].filter(Boolean);

  return (
    <OwnerPropertyAccordion
      rows={ownerRows}
      loading={loading}
      loadingLabel="Loading disbursements…"
      emptyLabel="No disbursements in this period."
      ownerStats={(owner) => [
        { label: "Properties", value: owner.properties.length },
        {
          label: "Disbursed",
          value: formatCurrency(owner.owner_payout),
          accent: "text-green-700",
        },
      ]}
      propertyMeta={(property) =>
        `${property.months.length} month${property.months.length === 1 ? "" : "s"} · ${formatCurrency(property.owner_payout)}`
      }
      renderProperty={(property) => (
        <NestedRows columns={monthColumns} rows={property.months} />
      )}
    />
  );
}
