"use client";

import { Filter } from "lucide-react";

export default function UnitFilters({ filters, onChange }) {
  return (
    <div className="border border-stone-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
        <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by unit number…"
          value={filters.searchQuery}
          onChange={(e) => onChange({ searchQuery: e.target.value })}
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />
        <select
          value={filters.statusFilter}
          onChange={(e) => onChange({ statusFilter: e.target.value })}
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="all">All Statuses</option>
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
        <select
          value={filters.typeFilter}
          onChange={(e) => onChange({ typeFilter: e.target.value })}
          className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="all">All Types</option>
          <option value="bedsitter">Bedsitter</option>
          <option value="1-bedroom">1 Bedroom</option>
          <option value="2-bedroom">2 Bedroom</option>
          <option value="3-bedroom">3 Bedroom</option>
        </select>
      </div>
    </div>
  );
}
