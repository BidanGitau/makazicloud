"use client";

import { useState } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import { buildMaintenanceColumns } from "./MaintenanceColumns";

function toggleSetItem(setter, id) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

export default function MaintenanceSummary({
  rows,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const columnsWithUnit = buildMaintenanceColumns({
    onEdit,
    onDelete,
    onStatusChange,
    showProperty: false,
    showLocation: true,
  });
  const columnsWithoutUnit = buildMaintenanceColumns({
    onEdit,
    onDelete,
    onStatusChange,
    showProperty: false,
    showLocation: false,
  });

  if (!rows.length) return null;

  return (
    <div className="space-y-1">
      {rows.map((property) => {
        const propertyOpen = expandedProperties.has(property.id);
        return (
          <section key={property.id} className="border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => toggleSetItem(setExpandedProperties, property.id)}
              className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-4"
              aria-expanded={propertyOpen}
            >
              <div className="flex items-center gap-2 bg-white px-2 py-1.5 sm:col-span-2">
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
              <Metric label="Requests" value={property.request_count} />
              <Metric
                label="Open"
                value={property.open_count}
                accent="text-amber-800"
              />
            </button>

            {propertyOpen ? (
              <div className="space-y-1 bg-stone-50 p-1.5">
                {(property.blocks || []).map((block) => {
                  const blockKey = `${property.id}::${block.id}`;
                  const blockOpen = expandedGroups.has(blockKey);
                  return (
                    <InnerGroup
                      key={blockKey}
                      open={blockOpen}
                      title={block.name}
                      meta={`${block.request_count} request${block.request_count === 1 ? "" : "s"} · ${formatCurrency(block.total_cost)}`}
                      onToggle={() => toggleSetItem(setExpandedGroups, blockKey)}
                    >
                      <RequestTable columns={columnsWithUnit} rows={block.requests} />
                    </InnerGroup>
                  );
                })}

                {(property.units || []).map((unit) => {
                  const unitKey = `${property.id}::unit::${unit.id}`;
                  const unitOpen = expandedGroups.has(unitKey);
                  return (
                    <InnerGroup
                      key={unitKey}
                      open={unitOpen}
                      title={unit.name}
                      subtitle={unit.tenant_name}
                      meta={`${unit.request_count} request${unit.request_count === 1 ? "" : "s"} · ${formatCurrency(unit.total_cost)}`}
                      onToggle={() => toggleSetItem(setExpandedGroups, unitKey)}
                    >
                      <RequestTable columns={columnsWithoutUnit} rows={unit.requests} />
                    </InnerGroup>
                  );
                })}

                {(property.requests || []).length > 0 ? (
                  <div className="border border-stone-200 bg-white">
                    <div className="border-b border-stone-200 px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                        Other requests
                      </p>
                    </div>
                    <RequestTable columns={columnsWithUnit} rows={property.requests} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function InnerGroup({ open, title, subtitle, meta, onToggle, children }) {
  return (
    <div className="border border-stone-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-stone-200 px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown
            className={`h-3 w-3 text-black/55 transition-transform ${
              open ? "rotate-0" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-black">{title}</p>
            {subtitle ? (
              <p className="truncate text-[11px] text-black/55">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-black/55">{meta}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

function RequestTable({ columns, rows }) {
  return (
    <DataTable
      customStyles={compactEditorialTableStyles}
      columns={columns}
      data={rows || []}
      keyField="id"
      noHeader
      dense
      striped
      highlightOnHover
      responsive
      noDataComponent={
        <div className="py-6 text-center text-sm text-black/45">No requests.</div>
      }
    />
  );
}

function Metric({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-2 py-1.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
        {label}
      </p>
      <p className={`text-xs font-black tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
