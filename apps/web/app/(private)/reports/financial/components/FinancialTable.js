"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/app/_lib/formatters";
import OwnerPropertyAccordion, {
  NestedRows,
  groupRowsByOwner,
} from "@/app/_components/OwnerPropertyAccordion";
import { formatPct } from "../utils/financialReportUtils";

export default function FinancialTable({
  data,
  loading,
  netByProperty,
  properties = [],
}) {
  const propertiesById = useMemo(
    () => Object.fromEntries(properties.map((property) => [property.id, property])),
    [properties],
  );

  const grouped = useMemo(
    () =>
      groupRowsByOwner(
        data.map((row) => {
          const property = propertiesById[row.property_id] || {};
          return {
            ...row,
            property_name: row.property_name || property.name || "Unknown Property",
            owner_name: property.owner_name || row.owner_name || null,
            amount: Number(row.total_collected || 0),
          };
        }),
      ),
    [data, propertiesById],
  );

  const columns = useMemo(
    () => getColumns(netByProperty).filter((column) => column.name !== "Property"),
    [netByProperty],
  );

  return (
    <OwnerPropertyAccordion
      rows={grouped}
      loading={loading}
      loadingLabel="Loading financial data…"
      emptyLabel="No financial data available."
      ownerStats={(owner) => [
        { label: "Properties", value: owner.properties.length },
        {
          label: "Collected",
          value: formatCurrency(owner.amount),
          accent: "text-green-700",
        },
      ]}
      propertyMeta={(property) =>
        `${property.items.length} row${property.items.length === 1 ? "" : "s"} · ${formatCurrency(property.amount)}`
      }
      renderProperty={(property) => (
        <NestedRows
          columns={columns}
          rows={property.items}
          keyField="property_id"
        />
      )}
    />
  );
}

function getColumns(netByProperty) {
  return [
    {
      name: "Property",
      selector: (row) => row.property_name,
      sortable: true,
      grow: 1.4,
    },
    {
      name: "Units",
      selector: (row) => row.total_units,
      sortable: true,
      style: { justifyContent: "flex-end" },
      width: "75px",
    },
    {
      name: "Active Tenants",
      selector: (row) => row.active_tenants,
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Occupancy",
      selector: (row) => Number(row.occupancy_rate || 0),
      format: (row) => formatPct(row.occupancy_rate),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Collected",
      selector: (row) => Number(row.total_collected || 0),
      format: (row) => formatCurrency(row.total_collected),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
    {
      name: "Outstanding",
      selector: (row) => Number(row.total_outstanding || 0),
      format: (row) => formatCurrency(row.total_outstanding),
      sortable: true,
      style: { justifyContent: "flex-end", color: "#dc2626" },
    },
    {
      name: "Commission",
      selector: (row) => Number(netByProperty[row.property_id]?.commission_amount || 0),
      format: (row) => {
        const net = netByProperty[row.property_id] || {};
        const rate = Number(net.commission_rate || 0);
        return `${formatCurrency(net.commission_amount)} (${formatPct(rate)})`;
      },
      sortable: true,
      style: { justifyContent: "flex-end", color: "#1d4ed8" },
    },
    {
      name: "Maintenance",
      selector: (row) =>
        Number(netByProperty[row.property_id]?.total_maintenance_cost || 0),
      format: (row) =>
        formatCurrency(netByProperty[row.property_id]?.total_maintenance_cost),
      sortable: true,
      style: { justifyContent: "flex-end", color: "#b45309" },
    },
    {
      name: "Net Income",
      selector: (row) => Number(netByProperty[row.property_id]?.net_income || 0),
      format: (row) =>
        formatCurrency(netByProperty[row.property_id]?.net_income),
      sortable: true,
      style: { justifyContent: "flex-end", fontWeight: 600, color: "#059669" },
    },
    {
      name: "Collection Rate",
      selector: (row) => Number(row.collection_rate || 0),
      format: (row) => formatPct(row.collection_rate),
      sortable: true,
      style: { justifyContent: "flex-end" },
    },
  ];
}
