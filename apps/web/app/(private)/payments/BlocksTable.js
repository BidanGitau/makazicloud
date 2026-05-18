"use client";

import TenantPaymentsTable from "./TenantPaymentsTable";
import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";

export default function BlocksTable({
  blocks = [],
  payments = [],
  propertyId,
}) {
  const propertyPayments = payments.filter((p) => p.propertyId === propertyId);
  const blocksInProperty = blocks.filter((b) => b.property_id === propertyId);

  if (!blocksInProperty.length) {
    return <TenantPaymentsTable data={propertyPayments} indent={20} />;
  }

  const blockData = blocksInProperty.map((block) => {
    const tenantsInBlock = propertyPayments.filter(
      (p) => p.blockId === block.id
    );
    const totalAmount = tenantsInBlock.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );
    return { blockName: block.name, tenants: tenantsInBlock, totalAmount };
  });

  const ExpandableBlock = ({ data }) => (
    <TenantPaymentsTable data={data.tenants} indent={40} />
  );

  return (
    <div style={{ paddingLeft: 20 }}>
      <DataTable
        columns={[
          { name: "Block", selector: (r) => r.blockName, sortable: true },
          {
            name: "Total Payments",
            selector: (r) => r.totalAmount,
            sortable: true,
            cell: (r) => (
              <div style={{ textAlign: "right" }}>
                KSh {r.totalAmount.toLocaleString()}
              </div>
            ),
          },
        ]}
        data={blockData}
        customStyles={editorialTableStyles}
        expandableRows
        expandableRowsComponent={ExpandableBlock}
        highlightOnHover
        striped
        dense
        noHeader
      />
    </div>
  );
}
