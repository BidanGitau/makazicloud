"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { compactEditorialTableStyles } from "@/app/_components/tableStyles";
import { ChevronDown, Filter } from "lucide-react";
import ModalSlider from "@/app/_components/ModalSlider";
import UnitForm from "./UnitForm";
import TenantForm from "../tenants/TenantForm";
import { Properties, Units } from "@/app/_lib/repositories";
import { invalidateFormDataCache } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import EllipsisMenu from "@/app/_components/ElpsisMenu";
import LoadingSkeleton from "@/app/_components/LoadingSkeleton";
import { formatCurrency } from "@/app/_lib/formatters";
import { useAuth } from "@/app/_context/AuthContext";

export default function UnitsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("units:create");
  const canEdit = hasPermission("units:edit");
  const canDelete = hasPermission("units:delete");
  const canCreateTenant = hasPermission("tenants:create");
  const handledNewParam = useRef(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "true" && !handledNewParam.current) {
      handledNewParam.current = true;
      if (canCreate) setOpen(true);
      window.history.replaceState(window.history.state, "", pathname);
    }
  }, [canCreate, pathname, searchParams]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [unitToAssign, setUnitToAssign] = useState(null);
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const normalized = await Properties.getTree();
      setProperties(normalized);
    } catch (err) {
      console.error("Failed to fetch units:", err);
      showToast.error("Failed to load units!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      await Units.remove(id);
      invalidateFormDataCache();
      showToast.success("Unit deleted successfully!");
      fetchUnits();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast.error("Failed to delete unit!");
    }
  };

  const handleEdit = (unit) => {
    setSelectedUnit(unit);
    setEditOpen(true);
  };

  const isVacantUnit = (unit) =>
    ["vacant", "available"].includes(String(unit?.status || "").toLowerCase());

  const handleAssignUnit = (unit) => {
    setUnitToAssign(unit);
    setAssignOpen(true);
  };

  const unitColumns = [
    {
      name: "Unit #",
      selector: (row) => row.unit_number,
      cell: (row) => {
        if (row.isSummary) {
          return (
            <span className="font-semibold text-black">
              Total Units: {row.total_units}
            </span>
          );
        }
        const value = row.unit_number;
        const unitNumber =
          typeof value === "string" && value
            ? value[0].toUpperCase() + value.slice(1)
            : value || "-";
        return (
          <div className="py-0.5">
            <p className="text-xs font-semibold text-black">#{unitNumber}</p>
            <p className="text-[11px] text-black/55">{row.type || "Unit"}</p>
          </div>
        );
      },
      sortable: true,
      grow: 2,
    },
    {
      name: "Type",
      selector: (row) => row.type || "-",
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span className="text-black/70">{row.type || "-"}</span>
        ),
      sortable: true,
    },
    {
      name: "Floor",
      selector: (row) => row.floor ?? "-",
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span className="text-black/70">{row.floor ?? "-"}</span>
        ),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) =>
        row.isSummary ? (
          ""
        ) : (
          <span
            className={
              String(row.status).toLowerCase() === "occupied"
                ? "border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-green-700"
                : "border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-700"
            }
          >
            {String(row.status || "vacant").toLowerCase()}
          </span>
        ),
      sortable: true,
    },
    {
      name: "Rent",
      selector: (row) => row.rent_amount,
      cell: (row) =>
        row.isSummary ? (
          <span className="font-mono font-semibold tabular-nums text-black">
            {formatCurrency(row.rent_amount)}
          </span>
        ) : row.rent_amount ? (
          <span className="font-mono font-semibold tabular-nums text-black">
            {formatCurrency(row.rent_amount)}
          </span>
        ) : (
          "-"
        ),
      sortable: true,
      width: "112px",
    },
    (canEdit || canDelete || canCreateTenant) && {
      name: "Actions",
      cell: (row) =>
        row.isSummary ? null : (
          <EllipsisMenu
            items={[
              canCreateTenant &&
                isVacantUnit(row) && {
                  label: "Assign Unit",
                  onClick: () => handleAssignUnit(row),
                },
              canEdit && { label: "Edit", onClick: () => handleEdit(row) },
              canDelete && {
                label: "Delete",
                onClick: () => handleDelete(row.id),
                destructive: true,
              },
            ].filter(Boolean)}
          />
        ),
      width: "64px",
    },
  ].filter(Boolean);

  const NoUnitsMessage = () => (
    <div className="py-3 text-sm text-black/55">
      No units found.{" "}
      {canCreate ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
        >
          + Add a unit
        </button>
      ) : null}
    </div>
  );

  const filterUnits = (units) =>
    units.filter((unit) => {
      const matchesStatus =
        statusFilter === "all" ||
        String(unit?.status || "").toLowerCase() === statusFilter;
      const matchesType =
        typeFilter === "all" ||
        unit.type?.toLowerCase()?.includes(typeFilter.toLowerCase());
      const matchesSearch =
        searchQuery === "" ||
        unit.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });

  const buildUnitsData = (units) => {
    if (!units.length) return units;
    const totalRent = units.reduce(
      (sum, unit) => sum + Number(unit?.rent_amount || 0),
      0,
    );

    return [
      ...units,
      {
        isSummary: true,
        unit_number: "Total",
        total_units: units.length,
        rent_amount: totalRent,
      },
    ];
  };

  const unitRowStyles = [
    {
      when: (row) => row.isSummary,
      style: {
        fontWeight: 600,
        backgroundColor: "#f5f5f4",
        borderTop: "1px solid #e7e5e4",
      },
    },
  ];

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Inventory —</p>
          <h1
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Units
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Every rentable unit across your portfolio. Expand a property to see
            its blocks and units.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-800"
          >
            + Add Unit
          </button>
        )}
      </header>

      <div className="border border-stone-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by unit number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="all">All Statuses</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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

      {loading ? (
        <LoadingSkeleton rows={6} columns={6} />
      ) : (
        <div className="space-y-1">
          {properties.map((property) => {
            const directUnits = filterUnits(property.units || []);
            const blockUnits = (property.blocks || []).flatMap((block) =>
              filterUnits(block.units || []),
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
                  onClick={() => toggleSetItem(setExpandedProperties, propertyKey)}
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
                    <p className="text-xs font-black tabular-nums text-black">{occupiedUnits}</p>
                  </div>
                  <div className="bg-white px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                      Vacant
                    </p>
                    <p className="text-xs font-black tabular-nums text-blue-700">{vacantUnits}</p>
                  </div>
                </button>

                {propertyOpen && (
                  <div className="space-y-1 bg-stone-50 p-1.5">
                    {(property.blocks || []).map((block) => {
                      const blockKey = `${propertyKey}:${block.id || block.name}`;
                      const blockOpen = expandedBlocks.has(blockKey);
                      const rows = buildUnitsData(filterUnits(block.units || []));
                      return (
                        <div key={blockKey} className="border border-stone-200 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleSetItem(setExpandedBlocks, blockKey)}
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
                              <p className="truncate text-xs font-semibold text-black">{block.name}</p>
                            </div>
                            <span className="text-[11px] text-black/55">
                              {Math.max(rows.length - 1, 0)} unit{rows.length === 2 ? "" : "s"}
                            </span>
                          </button>
                          {blockOpen && (
                            <UnitRows
                              columns={unitColumns}
                              rows={rows}
                              noDataComponent={<NoUnitsMessage />}
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
                          columns={unitColumns}
                          rows={buildUnitsData(directUnits)}
                          noDataComponent={<NoUnitsMessage />}
                          conditionalRowStyles={unitRowStyles}
                        />
                      </div>
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
        title="Add New Unit"
      >
        <UnitForm
          isOpen={open}
          onSuccess={() => {
            setOpen(false);
            fetchUnits();
            showToast.success("Unit added successfully!");
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedUnit(null);
        }}
        title={`Edit Unit: ${selectedUnit?.unit_number || ""}`}
      >
        {selectedUnit && (
          <UnitForm
            initialData={selectedUnit}
            onSuccess={() => {
              setEditOpen(false);
              setSelectedUnit(null);
              fetchUnits();
              showToast.success("Unit updated successfully!");
            }}
          />
        )}
      </ModalSlider>

      <ModalSlider
        isOpen={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setUnitToAssign(null);
        }}
        title={`Assign Unit: ${unitToAssign?.unit_number || ""}`}
      >
        {unitToAssign && (
          <TenantForm
            initialAssignment={{
              property_id: unitToAssign.property_id || "",
              block_id: unitToAssign.block_id || "",
              unit_id: unitToAssign.id || "",
            }}
            onSuccess={() => {
              setAssignOpen(false);
              setUnitToAssign(null);
              fetchUnits();
              showToast.success("Tenant assigned successfully!");
            }}
          />
        )}
      </ModalSlider>
    </div>
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

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}
