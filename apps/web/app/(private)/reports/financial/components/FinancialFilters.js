export default function FinancialFilters({
  properties,
  propertyBlocks,
  filters,
  onChange,
  onReset,
}) {
  return (
    <div className="border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        <select
          value={filters.propertyId}
          onChange={(e) =>
            onChange({ propertyId: e.target.value, blockId: "" })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>

        <select
          value={filters.blockId}
          onChange={(e) => onChange({ blockId: e.target.value })}
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
          disabled={!filters.propertyId || propertyBlocks.length === 0}
        >
          <option value="">
            {filters.propertyId
              ? propertyBlocks.length > 0
                ? "All Blocks"
                : "No blocks"
              : "Select property first"}
          </option>
          {propertyBlocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>

        <select
          value={filters.occupancyFilter}
          onChange={(e) => onChange({ occupancyFilter: e.target.value })}
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="active">Active only</option>
          <option value="all">All properties</option>
          <option value="vacant">No active tenants</option>
          <option value="with_outstanding">With outstanding</option>
        </select>

        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search property..."
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange({ endDate: e.target.value })}
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />

        <div>
          <button
            type="button"
            onClick={onReset}
            className="w-full border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
