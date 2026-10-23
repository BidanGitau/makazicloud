"use client";

import OwnerPropertyAccordion, { NestedRows } from "@/app/_components/OwnerPropertyAccordion";
import { formatCurrency } from "@/app/_lib/formatters";

function amountOwnerStats(owner) {
  return [
    { label: "Properties", value: owner.properties.length },
    {
      label: "Amount",
      value: formatCurrency(owner.amount),
      accent: "text-amber-800",
    },
  ];
}

export default function DeductionsByOwner({ rows, loading, columns }) {
  return (
    <OwnerPropertyAccordion
      rows={rows}
      loading={loading}
      loadingLabel="Loading deductions…"
      emptyLabel="No deductions in this period."
      ownerStats={amountOwnerStats}
      propertyMeta={(property) =>
        `${property.items.length} item${property.items.length === 1 ? "" : "s"} · ${formatCurrency(property.amount)}`
      }
      renderProperty={(property) => (
        <NestedRows columns={columns} rows={property.items} />
      )}
    />
  );
}
