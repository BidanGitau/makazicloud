"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { ChevronDown } from "lucide-react";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import ModalSlider from "@/app/_components/ModalSlider";
import PropertyForm from "./PropertyForm";
import { Properties } from "@/app/_lib/repositories";
import { invalidateFormDataCache } from "@/app/_hooks/useFormData";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import { showToast } from "@/app/_components/CustomToast";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import { useAuth } from "@/app/_context/AuthContext";

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const handledNewParam = useRef(false);
  const canCreate = hasPermission("properties:create");
  const canEdit = hasPermission("properties:edit");
  const canDelete = hasPermission("properties:delete");
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [expandedProperties, setExpandedProperties] = useState(new Set());

  useEffect(() => {
    if (searchParams.get("new") === "true" && !handledNewParam.current) {
      handledNewParam.current = true;
      if (canCreate) setOpen(true);
      window.history.replaceState(window.history.state, "", pathname);
    }
  }, [canCreate, pathname, searchParams]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const normalized = await Properties.getTree({
        propertyOrder: { column: "created_at", ascending: false },
      });
      setProperties(normalized);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      showToast.error("Failed to load properties!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      await Properties.remove(id);
      invalidateFormDataCache();
      showToast.success("Property deleted successfully!");
      fetchProperties();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast.error("Failed to delete property!");
    }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setEditOpen(true);
  };

  const blockColumns = [
    { name: "Block Name", selector: (row) => row.name, sortable: true },
    { name: "Total Units", selector: (row) => row.total_units, sortable: true },
    {
      name: "Occupied",
      selector: (row) =>
        row.units?.filter((u) => u.status === "occupied").length || 0,
      sortable: true,
    },
    {
      name: "Vacant",
      selector: (row) => getVacantCount(row),
      sortable: true,
    },
    {
      name: "Occupancy %",
      selector: (row) => getOccupancyPercent(row),
      sortable: true,
    },
  ];

  const summary = {
    properties: properties.length,
    units: properties.reduce((s, p) => s + Number(p.total_units || 0), 0),
    blocks: properties.reduce((s, p) => s + (p.blocks?.length || 0), 0),
  };

  return (
    <div className="space-y-2 p-1 sm:p-2">
      <header className="flex justify-end">
        {canCreate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-800"
          >
            + Add Property
          </button>
        )}
      </header>

      {!loading && properties.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-stone-200 bg-stone-200">
          <div className="bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
              Properties
            </p>
            <p
              className="text-sm font-black tabular-nums text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.properties}
            </p>
          </div>
          <div className="bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
              Blocks
            </p>
            <p
              className="text-sm font-black tabular-nums text-blue-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.blocks}
            </p>
          </div>
          <div className="bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
              Total Units
            </p>
            <p
              className="text-sm font-black tabular-nums text-blue-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.units}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-1">
          {properties.map((property) => {
            const propertyOpen = expandedProperties.has(property.id);
            const blocks = property.blocks || [];
            const occupied = getOccupiedCount(property);
            const vacant = getVacantCount(property);
            const occupancy = getOccupancyPercent(property);

            return (
              <section key={property.id} className="border border-stone-200 bg-white">
                <div className="grid gap-px border-b border-stone-200 bg-stone-200 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(90px,1fr))_64px]">
                  <button
                    type="button"
                    onClick={() => toggleSetItem(setExpandedProperties, property.id)}
                    className="flex items-center gap-2 bg-white px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
                    aria-expanded={propertyOpen}
                  >
                    <ChevronDown
                      className={`h-3 w-3 text-black/55 transition-transform ${
                        propertyOpen ? "rotate-0" : "-rotate-90"
                      }`}
                      strokeWidth={2}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-black">{property.name}</p>
                      <p className="truncate text-[11px] text-black/55">
                        {property.address || "No address"}
                      </p>
                    </div>
                  </button>
                  {[
                    ["Blocks", blocks.length],
                    ["Units", property.total_units || 0],
                    ["Vacant", vacant],
                    ["Occ.", occupancy],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white px-2 py-1.5">
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                        {label}
                      </p>
                      <p className="text-xs font-black tabular-nums text-black">{value}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-end bg-white px-2 py-1.5">
                    {(canEdit || canDelete) && (
                      <EllipsisMenu
                        items={[
                          canEdit && { label: "Edit", onClick: () => handleEdit(property) },
                          canDelete && {
                            label: "Delete",
                            onClick: () => handleDelete(property.id),
                            destructive: true,
                          },
                        ].filter(Boolean)}
                      />
                    )}
                  </div>
                </div>

                {propertyOpen && (
                  <div className="bg-stone-50 p-1.5">
                    {blocks.length > 0 ? (
                      <DataTable
                        customStyles={compactEditorialTableStyles}
                        columns={blockColumns}
                        data={blocks}
                        highlightOnHover
                        striped
                        responsive
                        dense
                      />
                    ) : (
                      <DataTable
                        customStyles={compactEditorialTableStyles}
                        columns={[
                          { name: "Total Units", selector: (row) => row.total },
                          { name: "Occupied", selector: (row) => row.occupied },
                          { name: "Vacant", selector: (row) => row.vacant },
                          { name: "Occupancy %", selector: (row) => row.occupancy },
                        ]}
                        data={[
                          {
                            total: property.total_units || occupied + vacant,
                            occupied,
                            vacant,
                            occupancy,
                          },
                        ]}
                        highlightOnHover
                        striped
                        responsive
                        dense
                      />
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ModalSlider
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add New Property"
      >
        <PropertyForm
          onSuccess={() => {
            setOpen(false);
            fetchProperties();
            showToast.success("Property added successfully!");
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedProperty(null);
        }}
        title={`Edit Property: ${selectedProperty?.name || ""}`}
      >
        {selectedProperty && (
          <PropertyForm
            property={selectedProperty}
            onSuccess={() => {
              setEditOpen(false);
              setSelectedProperty(null);
              fetchProperties();
              showToast.success("Property updated successfully!");
            }}
          />
        )}
      </ModalSlider>
    </div>
  );
}

function getOccupiedCount(row) {
  return row.units?.filter((u) => u.status === "occupied").length || 0;
}

function getVacantCount(row) {
  const occupied = getOccupiedCount(row);
  const vacant = row.units?.filter((u) => u.status === "vacant").length || 0;
  const total = row.total_units || occupied + vacant;
  return row.units?.length ? vacant : Math.max(total - occupied, 0);
}

function getOccupancyPercent(row) {
  const occupied = getOccupiedCount(row);
  const vacant = row.units?.filter((u) => u.status === "vacant").length || 0;
  const total = row.total_units || occupied + vacant;
  return total > 0 ? `${Math.round((occupied / total) * 100)}%` : "0%";
}

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}
