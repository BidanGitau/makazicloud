"use client";

import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";

export default function TenantPaymentsTable({ data = [], indent = 0 }) {
  const columns = [
    { name: "Tenant", selector: (r) => r.tenantName, sortable: true },
    { name: "Unit", selector: (r) => r.unitNumber, sortable: true },
    {
      name: "Amount",
      selector: (r) => r.amount,
      sortable: true,
      cell: (r) => (
        <div style={{ textAlign: "right" }}>
          KSh {Number(r.amount).toLocaleString()}
        </div>
      ),
    },
    { name: "Date", selector: (r) => r.formattedDate, sortable: true },
    { name: "Method", selector: (r) => r.method, sortable: true },
    { name: "Reference", selector: (r) => r.reference || "-" },
  ];

  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      <DataTable
        columns={columns}
        data={data}
        customStyles={editorialTableStyles}
        highlightOnHover
        striped
        dense
        noHeader
      />
    </div>
  );
}
