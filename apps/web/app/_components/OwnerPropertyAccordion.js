"use client";

import { useState } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";

export function toggleSetItem(setter, id) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

export function groupRowsByOwner(rows) {
  const owners = new Map();

  for (const row of rows) {
    const ownerName = String(row.owner_name || "").trim() || "Unassigned owner";
    if (!owners.has(ownerName)) {
      owners.set(ownerName, {
        id: ownerName,
        owner_name: ownerName,
        amount: 0,
        properties: new Map(),
      });
    }
    const owner = owners.get(ownerName);
    const propertyKey = row.property_id || row.property_name || "unknown";
    if (!owner.properties.has(propertyKey)) {
      owner.properties.set(propertyKey, {
        id: propertyKey,
        property_name: row.property_name || "Unknown Property",
        amount: 0,
        items: [],
      });
    }
    const property = owner.properties.get(propertyKey);
    property.items.push(row);
    property.amount += Number(row.amount || 0);
    owner.amount += Number(row.amount || 0);
  }

  return [...owners.values()]
    .map((owner) => ({
      ...owner,
      properties: [...owner.properties.values()].sort((a, b) =>
        String(a.property_name).localeCompare(String(b.property_name)),
      ),
    }))
    .sort((a, b) => String(a.owner_name).localeCompare(String(b.owner_name)));
}

export function NestedRows({ columns, rows, keyField = "id" }) {
  if (!rows.length) {
    return (
      <p className="px-2 py-3 text-center text-[11px] text-black/45">No rows.</p>
    );
  }

  return (
    <DataTable
      customStyles={compactEditorialTableStyles}
      columns={columns}
      data={rows}
      keyField={keyField}
      noHeader
      dense
      striped
      highlightOnHover
      responsive
    />
  );
}

export default function OwnerPropertyAccordion({
  rows,
  loading,
  loadingLabel,
  emptyLabel,
  ownerStats,
  propertyMeta,
  renderProperty,
}) {
  const [expandedOwners, setExpandedOwners] = useState(new Set());
  const [expandedProperties, setExpandedProperties] = useState(new Set());

  if (loading && !rows.length) {
    return (
      <div className="border border-stone-200 bg-white py-10 text-center text-sm text-black/45">
        {loadingLabel}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="border border-stone-200 bg-white py-10 text-center text-sm text-black/45">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map((owner) => {
        const ownerOpen = expandedOwners.has(owner.id);
        const stats = ownerStats(owner);
        return (
          <section key={owner.id} className="border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => toggleSetItem(setExpandedOwners, owner.id)}
              className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-4"
              aria-expanded={ownerOpen}
            >
              <div className="flex items-center gap-2 bg-white px-2 py-1.5 sm:col-span-2">
                <ChevronDown
                  className={`h-3 w-3 text-black/55 transition-transform ${
                    ownerOpen ? "rotate-0" : "-rotate-90"
                  }`}
                  strokeWidth={2}
                />
                <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
                  {owner.owner_name}
                </p>
              </div>
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                    {stat.label}
                  </p>
                  <p
                    className={`text-xs font-black tabular-nums ${stat.accent || "text-black"}`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </button>

            {ownerOpen ? (
              <div className="space-y-1 bg-stone-50 p-1.5">
                {owner.properties.map((property) => {
                  const propertyKey = `${owner.id}::${property.id}`;
                  const propertyOpen = expandedProperties.has(propertyKey);
                  return (
                    <div key={propertyKey} className="border border-stone-200 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleSetItem(setExpandedProperties, propertyKey)}
                        className="flex w-full items-center justify-between border-b border-stone-200 px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
                        aria-expanded={propertyOpen}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ChevronDown
                            className={`h-3 w-3 text-black/55 transition-transform ${
                              propertyOpen ? "rotate-0" : "-rotate-90"
                            }`}
                            strokeWidth={2}
                          />
                          <p className="truncate text-xs font-semibold text-black">
                            {property.property_name}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-black/55">
                          {propertyMeta(property)}
                        </span>
                      </button>
                      {propertyOpen ? renderProperty(property) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
