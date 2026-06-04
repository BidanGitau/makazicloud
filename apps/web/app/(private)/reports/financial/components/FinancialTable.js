import DataTable from "react-data-table-component";
import { formatCurrency } from "@/app/_lib/formatters";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { formatPct } from "../utils/financialReportUtils";

export default function FinancialTable({ data, loading, netByProperty }) {
  return (
    <DataTable
      columns={getColumns(netByProperty)}
      data={data}
      customStyles={editorialTableStyles}
      pagination
      progressPending={loading}
      noDataComponent={
        <div className="py-10 text-center text-gray-500 text-sm">
          No financial data available.
        </div>
      }
      responsive
      striped
      highlightOnHover
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
