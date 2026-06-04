import DataTable from "react-data-table-component";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { formatKes, formatMonth } from "../utils/arrearsFormatters";

export default function ArrearsTable({
  rows,
  statusFilter,
  onPayment,
  onSms,
  onEmail,
  onSelectedRowsChange,
}) {
  return (
    <DataTable
      columns={getTenantColumns({ onPayment, onSms, onEmail })}
      data={rows}
      customStyles={editorialTableStyles}
      pagination
      highlightOnHover
      striped
      responsive
      expandableRows
      expandableRowsComponent={ExpandedMonths}
      selectableRows
      onSelectedRowsChange={({ selectedRows }) =>
        onSelectedRowsChange(selectedRows)
      }
      noDataComponent={
        <div className="py-10 text-center text-gray-500 text-sm">
          {statusFilter === "advance"
            ? "No advance payments found."
            : statusFilter === "all"
              ? "No arrears or advance payments found."
              : "No arrears found."}
        </div>
      }
    />
  );
}

function getTenantColumns({ onPayment, onSms, onEmail }) {
  return [
    {
      name: "Tenant / Property",
      selector: (row) => row.tenantName,
      cell: (row) => (
        <div className="py-2">
          <p className="font-semibold">{row.tenantName}</p>
          <p className="text-sm text-gray-500">
            {row.propertyName} → {row.blockName} → {row.unitNumber}
          </p>
        </div>
      ),
      sortable: true,
      grow: 3,
    },
    {
      name: "Months",
      selector: (row) => row.monthCount,
      cell: (row) => (
        <span className="font-semibold text-black">
          {row.monthCount} {row.monthCount === 1 ? "month" : "months"}
        </span>
      ),
      sortable: true,
      width: "120px",
    },
    {
      name: "Total Due (KSh)",
      selector: (row) => Number(row.totalDue || 0),
      format: (row) => formatKes(row.totalDue),
      sortable: true,
      width: "160px",
    },
    {
      name: "Balance (KSh)",
      selector: (row) => Number(row.totalBalance || row.totalCredit || 0),
      sortable: true,
      width: "150px",
      cell: (row) => {
        if (row.totalCredit > 0 && row.totalBalance <= 0) {
          return (
            <span className="text-blue-700 font-semibold">
              +{formatKes(row.totalCredit)}
            </span>
          );
        }
        if (row.totalBalance > 0) {
          return (
            <span className="text-red-600 font-semibold">
              {formatKes(row.totalBalance)}
            </span>
          );
        }
        return <span className="text-green-600 font-medium">Cleared</span>;
      },
    },
    {
      name: "Action",
      cell: (row) => (
        <EllipsisMenu
          menuId={row.tenant_id || row.id || row.tenantName || "arrears"}
          items={[
            { label: "Add Payment", onClick: () => onPayment(row) },
            { label: "Send SMS", onClick: () => onSms(row, row.rows) },
            { label: "Send Email", onClick: () => onEmail([row]) },
          ]}
        />
      ),
      width: "96px",
    },
  ];
}

function ExpandedMonths({ data }) {
  return (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      <div className="grid gap-2">
        {data.rows.map((row) => {
          const due = Number(row.amount_due || 0);
          const paid = Number(row.amount_paid || 0);
          const balance = Number(row.balance || due - paid);
          const credit = Math.max(0, paid - due);
          return (
            <div
              key={row.id || `${row.tenant_id}-${row.month}`}
              className="grid grid-cols-1 gap-2 border border-stone-200 bg-white px-3 py-2 text-sm sm:grid-cols-4 sm:items-center"
            >
              <div className="font-semibold text-black">
                {formatMonth(row.month)}
              </div>
              <div className="text-black/65">Due: KSh {formatKes(due)}</div>
              <div className="text-black/65">Paid: KSh {formatKes(paid)}</div>
              <div>
                {row.isAdvance ? (
                  <span className="font-semibold text-blue-700">
                    Credit: +KSh {formatKes(credit)}
                  </span>
                ) : balance > 0 ? (
                  <span className="font-semibold text-red-600">
                    Balance: KSh {formatKes(balance)}
                  </span>
                ) : (
                  <span className="font-semibold text-green-600">Cleared</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
