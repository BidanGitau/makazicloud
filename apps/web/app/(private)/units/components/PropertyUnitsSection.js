"use client";

import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import {
  buildUnitsData,
  filterUnits,
  unitRowStyles,
} from "../utils/unitFilters";

/** One property: occupancy header, then a unit table per block and for direct units. */
export default function PropertyUnitsSection({
  property,
  filters,
  columns,
  noDataComponent,
  expandedProperties,
  expandedBlocks,
  onToggleProperty,
  onToggleBlock,
}) {
  const directUnits = filterUnits(property.units || [], filters);
  const blockUnits = (property.blocks || []).flatMap((block) =>
    filterUnits(block.units || [], filters),
  );
  const filteredUnits = [...directUnits, ...blockUnits];
  const occupiedUnits = filteredUnits.filter(
    (unit) => String(unit.status || "").toLowerCase() === "occupied",
  ).length;
  const vacantUnits = filteredUnits.filter((unit) =>
    ["vacant", "available"].includes(String(unit.status || "").toLowerCase()),
  ).length;
  const propertyOpen = expandedProperties.has(property.id || property.name);
  const propertyKey = property.id || property.name;
  return (
    <section key={propertyKey} className="border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => onToggleProperty(propertyKey)}
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
        <div className="bg-white px-2 py-1.5">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
            Occupied
          </p>
          <p className="text-xs font-black tabular-nums text-black">
            {occupiedUnits}
          </p>
        </div>
        <div className="bg-white px-2 py-1.5">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
            Vacant
          </p>
          <p className="text-xs font-black tabular-nums text-blue-700">
            {vacantUnits}
          </p>
        </div>
      </button>

      {propertyOpen && (
        <div className="space-y-1 bg-stone-50 p-1.5">
          {(property.blocks || []).map((block) => {
            const blockKey = `${propertyKey}:${block.id || block.name}`;
            const blockOpen = expandedBlocks.has(blockKey);
            const rows = buildUnitsData(
              filterUnits(block.units || [], filters),
            );
            return (
              <div key={blockKey} className="border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => onToggleBlock(blockKey)}
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
                    <p className="truncate text-xs font-semibold text-black">
                      {block.name}
                    </p>
                  </div>
                  <span className="text-[11px] text-black/55">
                    {Math.max(rows.length - 1, 0)} unit
                    {rows.length === 2 ? "" : "s"}
                  </span>
                </button>
                {blockOpen && (
                  <UnitRows
                    columns={columns}
                    rows={rows}
                    noDataComponent={noDataComponent}
                    conditionalRowStyles={unitRowStyles}
                  />
                )}
              </div>
            );
          })}

          {directUnits.length > 0 && (
            <div className="border border-stone-200 bg-white">
              <div className="border-b border-stone-200 px-2 py-1.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                  Direct Units
                </p>
              </div>
              <UnitRows
                columns={columns}
                rows={buildUnitsData(directUnits)}
                noDataComponent={noDataComponent}
                conditionalRowStyles={unitRowStyles}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function UnitRows({ columns, rows, noDataComponent, conditionalRowStyles }) {
  return (
    <DataTable
      customStyles={compactEditorialTableStyles}
      columns={columns}
      data={rows}
      noDataComponent={noDataComponent}
      highlightOnHover
      striped
      responsive
      dense
      conditionalRowStyles={conditionalRowStyles}
    />
  );
}
