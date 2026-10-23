"use client";

import { Filter } from "lucide-react";
import { defaultFilters } from "../utils/utilityTree";

export default function UtilityFilters({
  filters,
  setFilters,
  properties,
  blocks: filterBlocks,
  units: filterUnits,
  hasFilters,
}) {
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="border border-stone-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
        <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <select
          value={filters.property}
          onChange={(e) =>
            setFilters({ ...defaultFilters(), property: e.target.value })
          }
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.block}
          onChange={(e) =>
            setFilters((f) => ({ ...f, block: e.target.value, unit: "" }))
          }
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
          disabled={!filters.property || filterBlocks.length === 0}
        >
          <option value="">All Blocks</option>
          {filterBlocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={filters.unit}
          onChange={(e) => setFilter("unit", e.target.value)}
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
          disabled={!filters.property || filterUnits.length === 0}
        >
          <option value="">All Units</option>
          {filterUnits.map((u) => (
            <option key={u.id} value={u.id}>
              Unit {u.unit_number}
            </option>
          ))}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilter("month", e.target.value)}
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => setFilters(defaultFilters())}
          className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
