"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import { Input, Select } from "antd";
import { Search, Filter } from "lucide-react";
import ModalSlider from "@/app/_components/ModalSlider";
import UnitForm from "./UnitForm";
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
          <div className="py-2">
            <p className="font-semibold text-black">#{unitNumber}</p>
            <p className="text-sm text-black/55">{row.type || "Unit"}</p>
          </div>
        );
      },
      sortable: true,
      grow: 2,
    },
    {
      name: "Type",
      selector: (row) => row.type || "-",
      cell: (row) => (
        row.isSummary ? "" : <span className="text-black/70">{row.type || "-"}</span>
      ),
      sortable: true,
    },
    {
      name: "Floor",
      selector: (row) => row.floor ?? "-",
      cell: (row) => (
        row.isSummary ? "" : <span className="text-black/70">{row.floor ?? "-"}</span>
      ),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        row.isSummary ? (
          ""
        ) : (
          <span
            className={
              String(row.status).toLowerCase() === "occupied"
                ? "border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-green-700"
                : "border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700"
            }
          >
            {String(row.status || "vacant").toLowerCase()}
          </span>
        )
      ),
      sortable: true,
    },
    {
      name: "Rent",
      selector: (row) => row.rent_amount,
      cell: (row) =>
        row.isSummary
          ? (
              <span className="font-mono font-semibold tabular-nums text-black">
                {formatCurrency(row.rent_amount)}
              </span>
            )
          : row.rent_amount
            ? (
                <span className="font-mono font-semibold tabular-nums text-black">
                  {formatCurrency(row.rent_amount)}
                </span>
              )
            : "-",
      sortable: true,
      width: "150px",
    },
    (canEdit || canDelete) && {
      name: "Actions",
      cell: (row) => (
        row.isSummary ? null : (
          <EllipsisMenu
            items={[
              canEdit && { label: "Edit", onClick: () => handleEdit(row) },
              canDelete && {
                label: "Delete",
                onClick: () => handleDelete(row.id),
                destructive: true,
              },
            ].filter(Boolean)}
          />
        )
      ),
      width: "96px",
    },
  ].filter(Boolean);

  const NoUnitsMessage = () => (
    <div className="py-4 text-sm text-black/55">
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
      0
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

  const BlockExpandable = ({ data }) => {
    const filtered = filterUnits(data.units || []);

    const dataWithSummary = buildUnitsData(filtered);

    return (
      <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
        <p className="section-label mb-3">— Units in {data.name} —</p>
        <DataTable
          customStyles={editorialTableStyles}
          columns={unitColumns}
          data={dataWithSummary}
          noDataComponent={<NoUnitsMessage />}
          highlightOnHover
          striped
          responsive
          conditionalRowStyles={[
            {
              when: (row) => row.isSummary,
              style: {
                fontWeight: 600,
                backgroundColor: "#f5f5f4",
                borderTop: "1px solid #e7e5e4",
              },
            },
          ]}
        />
      </div>
    );
  };

  const PropertyExpandable = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      {data.blocks?.length > 0 ? (
        <>
          <p className="section-label mb-3">— Blocks in {data.name} —</p>
          <DataTable
            customStyles={editorialTableStyles}
            columns={[
              {
                name: "Block",
                selector: (row) => row.name,
                sortable: true,
                cell: (row) => (
                  <span className="font-semibold text-black">{row.name}</span>
                ),
                grow: 3,
              },
              {
                name: "Total Units",
                selector: (row) => row.total_units || "-",
                cell: (row) => (
                  <span className="font-mono font-semibold tabular-nums text-black">
                    {row.total_units || "-"}
                  </span>
                ),
                sortable: true,
                width: "150px",
              },
            ]}
            data={data.blocks}
            expandableRows
            expandableRowsComponent={BlockExpandable}
            highlightOnHover
            striped
            responsive
          />
          {data.units?.length > 0 && (
            <div className="mt-4 border-t border-stone-200 bg-white pt-4">
              <p className="section-label mb-3">— Units in {data.name} —</p>
              <DataTable
                customStyles={editorialTableStyles}
                columns={unitColumns}
                data={buildUnitsData(filterUnits(data.units || []))}
                noDataComponent={<NoUnitsMessage />}
                highlightOnHover
                striped
                responsive
                conditionalRowStyles={[
                  {
                    when: (row) => row.isSummary,
                    style: {
                      fontWeight: 600,
                      backgroundColor: "#f5f5f4",
                      borderTop: "1px solid #e7e5e4",
                    },
                  },
                ]}
              />
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="section-label mb-3">— Units in {data.name} —</p>
          <DataTable
            customStyles={editorialTableStyles}
            columns={unitColumns}
            data={buildUnitsData(filterUnits(data.units || []))}
            noDataComponent={<NoUnitsMessage />}
            highlightOnHover
            striped
            responsive
            conditionalRowStyles={[
              {
                when: (row) => row.isSummary,
                style: {
                  fontWeight: 600,
                  backgroundColor: "#f5f5f4",
                  borderTop: "1px solid #e7e5e4",
                },
              },
            ]}
          />
        </div>
      )}
    </div>
  );

  const columns = [
    {
      name: "Property",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => {
        const blockUnits = (row.blocks || []).reduce(
          (sum, block) => sum + (block.units || []).length,
          0,
        );
        const directUnits = (row.units || []).length;
        const totalUnits = blockUnits + directUnits;
        const occupiedUnits = [
          ...(row.units || []),
          ...(row.blocks || []).flatMap((block) => block.units || []),
        ].filter((unit) => String(unit.status || "").toLowerCase() === "occupied").length;

        return (
          <div className="py-2">
            <p className="font-semibold text-black">{row.name}</p>
            <p className="text-sm text-black/55">
              {totalUnits} units · {occupiedUnits} occupied
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 p-3 sm:p-6">

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Inventory —</p>
          <h1
            className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
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
            className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            + Add Unit
          </button>
        )}
      </header>


      <div className="border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by unit number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="all">All Statuses</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
        <div>
          <DataTable
            customStyles={editorialTableStyles}
            columns={columns}
            data={properties}
            pagination
            highlightOnHover
            striped
            responsive
            expandableRows
            expandableRowsComponent={PropertyExpandable}
          />
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
    </div>
  );
}
