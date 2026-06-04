import { STATUS_FILTERS } from "../constants";

export default function ArrearsFilters({
  arrearsData,
  properties,
  selectedPropertyBlocks,
  filters,
  onChange,
  onClear,
}) {
  const { monthFilter, propertyFilter, blockFilter, statusFilter } = filters;
  const hasBlocksInSelectedProperty = selectedPropertyBlocks.length > 0;
  const hasFilters = monthFilter || propertyFilter || blockFilter;

  return (
    <div className="border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={monthFilter}
          onChange={(e) => onChange({ monthFilter: e.target.value })}
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Months</option>
          {[...new Set(arrearsData.map((a) => a.month?.slice(0, 7)))]
            .filter(Boolean)
            .sort()
            .map((m) => (
              <option key={m} value={m}>
                {new Date(m + "-02").toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
        </select>

        <select
          value={propertyFilter}
          onChange={(e) =>
            onChange({ propertyFilter: e.target.value, blockFilter: "" })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {propertyFilter && hasBlocksInSelectedProperty && (
          <select
            value={blockFilter}
            onChange={(e) => onChange({ blockFilter: e.target.value })}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Blocks</option>
            {selectedPropertyBlocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em]">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ statusFilter: value })}
              className={`px-4 py-2 transition-colors ${
                statusFilter === value
                  ? "bg-blue-700 text-white"
                  : "bg-white text-black/55 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="self-center text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
