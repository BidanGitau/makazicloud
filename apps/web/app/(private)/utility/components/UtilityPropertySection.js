"use client";

import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { billTableStyles } from "../BillColumns";
import { billSummaryRow } from "../utils/utilityTree";

/** One property's bills: totals header, then a table per block and for property-level bills. */
export default function UtilityPropertySection({
  property,
  columns,
  expandedProperties,
  expandedBlocks,
  onToggleProperty,
  onToggleBlock,
}) {
  const propertyOpen = expandedProperties.has(property.id);
  return (
    <section key={property.id} className="border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => onToggleProperty(property.id)}
        className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_90px_90px_140px_140px]"
        aria-expanded={propertyOpen}
      >
        <div className="flex items-center gap-2 bg-white px-2 py-1.5">
          <ChevronDown
            className={`h-3 w-3 text-black/55 transition-transform ${
              propertyOpen ? "rotate-0" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
          <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
            {property.name}
          </p>
        </div>
        <Metric label="Bills" value={property.bill_count} />
        <Metric label="Pending" value={property.pending_count} />
        <Metric
          label="Total"
          value={`KSh ${Number(property.total_amount || 0).toLocaleString("en-KE")}`}
        />
        <Metric
          label="Paid"
          value={`KSh ${Number(property.paid_amount || 0).toLocaleString("en-KE")}`}
        />
      </button>

      {propertyOpen && (
        <div className="space-y-1 bg-stone-50 p-1.5">
          {property.blocks.map((block) => {
            const blockKey = `${property.id}:${block.id}`;
            const blockOpen = expandedBlocks.has(blockKey);
            return (
              <div key={blockKey} className="border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => onToggleBlock(blockKey)}
                  className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_90px_90px_140px_140px]"
                  aria-expanded={blockOpen}
                >
                  <div className="flex min-w-0 items-center gap-2 bg-white px-2 py-1.5">
                    <ChevronDown
                      className={`h-3 w-3 text-black/55 transition-transform ${
                        blockOpen ? "rotate-0" : "-rotate-90"
                      }`}
                      strokeWidth={2}
                    />
                    <p className="truncate text-xs font-semibold text-black">
                      {block.name}
                    </p>
                  </div>
                  <Metric label="Bills" value={block.bill_count} />
                  <Metric label="Pending" value={block.pending_count} />
                  <Metric
                    label="Total"
                    value={`KSh ${Number(block.total_amount || 0).toLocaleString("en-KE")}`}
                  />
                  <Metric
                    label="Paid"
                    value={`KSh ${Number(block.paid_amount || 0).toLocaleString("en-KE")}`}
                  />
                </button>
                {blockOpen && (
                  <BillTable columns={columns} rows={block.bills || []} />
                )}
              </div>
            );
          })}

          {property.bills?.length > 0 && (
            <div className="border border-stone-200 bg-white">
              <div className="border-b border-stone-200 px-2 py-1.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                  Property Utility Bills
                </p>
              </div>
              <BillTable columns={columns} rows={property.bills} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BillTable({ columns, rows }) {
  return (
    <DataTable
      columns={columns}
      data={billSummaryRow(rows)}
      customStyles={billTableStyles}
      highlightOnHover
      striped
      responsive
      noDataComponent={<NoUtilityBillsMessage />}
      conditionalRowStyles={[
        {
          when: (row) => row.isSummary,
          style: {
            fontWeight: 600,
            backgroundColor: "#f5f5f4",
            borderTop: "1px solid #e7e5e4",
          },
        },
      ]}
    />
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white px-2 py-1.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
        {label}
      </p>
      <p className="text-xs font-black tabular-nums text-black">{value}</p>
    </div>
  );
}

export function NoUtilityBillsMessage({ hasFilters = false }) {
  return (
    <div className="py-10 text-center text-gray-500 text-sm">
      No bills found{hasFilters ? " for the selected filters" : ""}.
    </div>
  );
}
