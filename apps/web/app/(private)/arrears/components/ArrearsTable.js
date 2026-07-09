import { useState } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import { formatKes, formatMonth } from "../utils/arrearsFormatters";

const isInactiveTenant = (row) =>
  String(row?.tenantStatus || "").toLowerCase() === "inactive";

export default function ArrearsTable({
  rows,
  selectedRowIds = [],
  statusFilter,
  onPayment,
  onSms,
  onEmail,
  onSelectedRowsChange,
}) {
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());
  const [expandedTenants, setExpandedTenants] = useState(new Set());
  const selectedIds = new Set(selectedRowIds);
  const groupedRows = groupRowsByProperty(rows);
  const tenantColumns = getTenantColumns({
    onPayment,
    onSms,
    onEmail,
    selectedIds,
    onToggleSelected: onSelectedRowsChange
      ? (row) => {
          const nextIds = new Set(selectedIds);
          if (nextIds.has(row.id)) {
            nextIds.delete(row.id);
          } else {
            nextIds.add(row.id);
          }
          onSelectedRowsChange(rows.filter((item) => nextIds.has(item.id)));
        }
      : null,
  });

  if (!rows.length) {
    return (
      <div className="border border-stone-200 bg-white py-10 text-center text-sm text-gray-500">
        {statusFilter === "advance"
          ? "No advance payments found."
          : statusFilter === "all"
            ? "No arrears or advance payments found."
            : "No arrears found."}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groupedRows.map((property) => {
        const directTenants = property.tenants.filter((row) => !row.blockId);
        const propertyOpen = expandedProperties.has(property.id);
        return (
          <section key={property.id} className="border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => toggleSetItem(setExpandedProperties, property.id)}
              className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-6"
              aria-expanded={propertyOpen}
            >
              <div className="flex items-center gap-2 bg-white px-2 py-1.5 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-3 w-3 text-black/55 transition-transform ${
                      propertyOpen ? "rotate-0" : "-rotate-90"
                    }`}
                    strokeWidth={2}
                  />
                </div>
                <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
                  {property.name}
                </p>
                <p className="shrink-0 text-[11px] text-black/55">
                  {property.tenantCount} tenant{property.tenantCount === 1 ? "" : "s"}
                </p>
              </div>
              {[
                ["Months", property.monthCount],
                ["Total Payable", formatKes(property.totalDue)],
                ["Paid", formatKes(property.totalPaid)],
                ["Balance", formatKes(property.totalBalance || property.totalCredit)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                    {label}
                  </p>
                  <p
                    className={`text-xs font-black tabular-nums ${
                      label === "Balance" && property.totalBalance > 0
                        ? "text-red-600"
                        : label === "Balance" && property.totalCredit > 0
                          ? "text-blue-700"
                          : "text-black"
                    }`}
                  >
                    {label === "Months" ? value : `KSh ${value}`}
                  </p>
                </div>
              ))}
            </button>

            {propertyOpen && (
              <div className="space-y-1 bg-stone-50 p-1.5">
                {property.blocks.map((block) => {
                  const blockKey = `${property.id}:${block.id}`;
                  const blockOpen = expandedBlocks.has(blockKey);
                  return (
                    <div key={block.id} className="border border-stone-200 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleSetItem(setExpandedBlocks, blockKey)}
                        className="flex w-full items-center justify-between border-b border-stone-200 px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
                        aria-expanded={blockOpen}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ChevronDown
                            className={`h-3 w-3 text-black/55 transition-transform ${
                              blockOpen ? "rotate-0" : "-rotate-90"
                            }`}
                            strokeWidth={2}
                          />
                          <p className="truncate text-xs font-semibold text-black">{block.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px] text-black/55">
                          <span>
                            {block.tenants.length} tenant{block.tenants.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </button>
                      {blockOpen && (
                        <TenantRows
                          columns={tenantColumns}
                          rows={block.tenants}
                          expandedTenants={expandedTenants}
                          onExpandedTenantsChange={setExpandedTenants}
                        />
                      )}
                    </div>
                  );
                })}

                {directTenants.length > 0 && (
                  <div className="border border-stone-200 bg-white">
                    <div className="border-b border-stone-200 px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                        Direct Tenants
                      </p>
                    </div>
                    <TenantRows
                      columns={tenantColumns}
                      rows={directTenants}
                      expandedTenants={expandedTenants}
                      onExpandedTenantsChange={setExpandedTenants}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}

function getTenantColumns({
  onPayment,
  onSms,
  onEmail,
  selectedIds,
  onToggleSelected,
}) {
  const columns = [
    onToggleSelected && {
      name: "",
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => onToggleSelected(row)}
          aria-label={`Select ${row.tenantName}`}
          className="h-3.5 w-3.5 border-stone-300 accent-blue-700"
        />
      ),
      width: "36px",
    },
    {
      name: "Tenant / Property",
      selector: (row) => row.tenantName,
      cell: (row) => (
        <div className="py-0.5">
          <p className="text-xs font-semibold">{row.tenantName}</p>
          <p className="text-[11px] text-gray-500">
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
      width: "86px",
    },
    {
      name: "Total Payable",
      selector: (row) => Number(row.totalDue || 0),
      format: (row) => formatKes(row.totalDue),
      sortable: true,
      width: "112px",
    },
    {
      name: "Paid",
      selector: (row) => Number(row.totalPaid || 0),
      format: (row) => formatKes(row.totalPaid),
      sortable: true,
      width: "96px",
    },
    {
      name: "Balance",
      selector: (row) => Number(row.totalBalance || row.totalCredit || 0),
      sortable: true,
      width: "105px",
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
      cell: (row) => {
        if (isInactiveTenant(row)) return null;

        return (
          <EllipsisMenu
            menuId={row.tenant_id || row.id || row.tenantName || "arrears"}
            items={[
              onPayment && {
                label: "Update Payment",
                onClick: () => onPayment(row),
              },
              onSms && { label: "Send SMS", onClick: () => onSms(row, row.rows) },
              onEmail && { label: "Send Email", onClick: () => onEmail([row]) },
            ].filter(Boolean)}
          />
        );
      },
      width: "60px",
    },
  ];

  const visibleColumns = columns.filter(Boolean);
  if (!onPayment && !onSms && !onEmail) return visibleColumns.slice(0, -1);
  return visibleColumns;
}

function TenantRows({
  columns,
  rows,
  expandedTenants,
  onExpandedTenantsChange,
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      customStyles={compactEditorialTableStyles}
      dense
      highlightOnHover
      striped
      responsive
      expandableRows
      expandableRowsComponent={ExpandedMonths}
      expandableRowExpanded={(row) => expandedTenants?.has(row.id)}
      onRowExpandToggled={(expanded, row) => {
        onExpandedTenantsChange?.((current) => {
          const next = new Set(current);
          if (expanded) next.add(row.id);
          else next.delete(row.id);
          return next;
        });
      }}
      noDataComponent={
        <div className="py-5 text-center text-sm text-gray-500">
          No tenant rows found.
        </div>
      }
    />
  );
}

function groupRowsByProperty(rows) {
  const propertyMap = new Map();

  rows.forEach((row) => {
    const propertyId = row.propertyId || row.property_id || row.propertyName || "unknown";
    if (!propertyMap.has(propertyId)) {
      propertyMap.set(propertyId, {
        id: propertyId,
        name: row.propertyName || "Unknown Property",
        blocks: new Map(),
        tenants: [],
      });
    }

    const property = propertyMap.get(propertyId);
    const blockId = row.blockId || row.block_id || "";
    const normalizedRow = {
      ...row,
      blockId,
    };

    if (blockId) {
      if (!property.blocks.has(blockId)) {
        property.blocks.set(blockId, {
          id: blockId,
          name: row.blockName || "Block",
          tenants: [],
        });
      }
      property.blocks.get(blockId).tenants.push(normalizedRow);
    } else {
      property.tenants.push(normalizedRow);
    }
  });

  return [...propertyMap.values()].map((property) => {
    const blocks = [...property.blocks.values()];
    const tenants = [
      ...property.tenants,
      ...blocks.flatMap((block) => block.tenants),
    ];
    return {
      ...property,
      blocks,
      tenants,
      tenantCount: tenants.length,
      monthCount: tenants.reduce((sum, row) => sum + Number(row.monthCount || 0), 0),
      totalDue: tenants.reduce((sum, row) => sum + Number(row.totalDue || 0), 0),
      totalPaid: tenants.reduce((sum, row) => sum + Number(row.totalPaid || 0), 0),
      totalBalance: tenants.reduce((sum, row) => sum + Number(row.totalBalance || 0), 0),
      totalCredit: tenants.reduce((sum, row) => sum + Number(row.totalCredit || 0), 0),
    };
  });
}

function ExpandedMonths({ data }) {
  return (
    <div className="border-t border-stone-200 bg-stone-50 px-1.5 py-1.5">
      <div className="grid gap-1">
        {data.rows.map((row) => {
          const due = Number(row.amount_due || 0);
          const paid = Number(row.amount_paid || 0);
          const balance = Number(row.balance || due - paid);
          const credit = Math.max(0, paid - due);
          return (
            <div
              key={row.id || `${row.tenant_id}-${row.month}`}
              className="grid grid-cols-1 gap-1 border border-stone-200 bg-white px-2 py-1 text-[11px] sm:grid-cols-4 sm:items-center"
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
