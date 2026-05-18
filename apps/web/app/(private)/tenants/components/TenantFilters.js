"use client";

import { useMemo } from "react";

const TenantFilters = ({ filters, onFiltersChange, tenants }) => {
  const uniqueProperties = useMemo(() => {
    return [...new Set(tenants.map((t) => t.property_name))].filter(Boolean);
  }, [tenants]);
  const propertyBlocks = useMemo(() => {
    if (!filters.property) return [];
    return [
      ...new Set(
        tenants
          .filter((t) => t.property_name === filters.property)
          .map((t) => t.block_name),
      ),
    ].filter(Boolean);
  }, [tenants, filters.property]);
  const showBlockFilter = Boolean(filters.property && propertyBlocks.length > 0);

  return (
    <div className="border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <input
          type="text"
          placeholder="Search tenants…"
          value={filters.search || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />

        <select
          value={filters.status || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: e.target.value || null })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.property || ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              property: e.target.value || null,
              block: null,
            })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Properties</option>
          {uniqueProperties.map((property) => (
            <option key={property} value={property}>
              {property}
            </option>
          ))}
        </select>

        {showBlockFilter && (
          <select
            value={filters.block || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, block: e.target.value || null })
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Blocks</option>
            {propertyBlocks.map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>
        )}

        <select
          value={filters.arrears || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, arrears: e.target.value || null })
          }
          className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">All Tenants</option>
          <option value="with_arrears">With Arrears</option>
          <option value="no_arrears">No Arrears</option>
        </select>
      </div>
    </div>
  );
};

export default TenantFilters;
