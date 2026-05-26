"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { editorialTableStyles } from "@/app/_components/tableStyles";
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

  const columns = [
    { name: "Name", selector: (row) => row.name, sortable: true },
    { name: "Address", selector: (row) => row.address || "-", sortable: true },
    { name: "Owner", selector: (row) => row.owner_name || "-", sortable: true },
    {
      name: "Total Units",
      selector: (row) => row.total_units || "-",
      sortable: true,
    },
    {
      name: "Deadline",
      selector: (row) => row.rent_due_day ?? 5,
      cell: (row) => {
        const day = row.rent_due_day ?? 5;
        const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
        return <span className="text-sm font-medium text-gray-700">{day}{suffix} of month</span>;
      },
      sortable: true,
      width: "130px",
    },
    {
      name: "Created At",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
    (canEdit || canDelete) && {
      name: "Actions",
      cell: (row) => (
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
      ),
    },
  ].filter(Boolean);

  const ExpandedComponent = ({ data }) => {
    if (data.blocks?.length > 0) {
      const blockColumns = [
        { name: "Block Name", selector: (row) => row.name, sortable: true },
        {
          name: "Total Units",
          selector: (row) => row.total_units,
          sortable: true,
        },
        {
          name: "Occupied",
          selector: (row) => {
            const occupied =
              row.units?.filter((u) => u.status === "occupied").length || 0;
            return occupied;
          },
          sortable: true,
        },
        {
          name: "Vacant",
          selector: (row) => {
            const occupied =
              row.units?.filter((u) => u.status === "occupied").length || 0;
            const vacant =
              row.units?.filter((u) => u.status === "vacant").length || 0;
            const total = row.total_units || occupied + vacant;
            return row.units?.length ? vacant : Math.max(total - occupied, 0);
          },
          sortable: true,
        },
        {
          name: "Occupancy %",
          selector: (row) => {
            const occupied =
              row.units?.filter((u) => u.status === "occupied").length || 0;
            const vacant =
              row.units?.filter((u) => u.status === "vacant").length || 0;
            const total = row.total_units || occupied + vacant;
            return total > 0
              ? `${Math.round((occupied / total) * 100)}%`
              : "0%";
          },
          sortable: true,
        },
      ];

      return (
        <div className="border-l-2 border-blue-700 bg-stone-50 p-4">
          <p className="section-label mb-3">— Blocks —</p>
          <DataTable
            customStyles={editorialTableStyles}
            columns={blockColumns}
            data={data.blocks}
            highlightOnHover
            striped
            responsive
          />
        </div>
      );
    } else {
      const units = data.units || [];
      const occupied = units.filter((u) => u.status === "occupied").length;
      const vacant = units.filter((u) => u.status === "vacant").length;
      const total = data.total_units || occupied + vacant;
      const vacantTotal = units.length
        ? vacant
        : Math.max(total - occupied, 0);
      const occupancy =
        total > 0 ? `${Math.round((occupied / total) * 100)}%` : "0%";

      const summaryColumns = [
        { name: "Total Units", selector: (row) => row.total },
        { name: "Occupied", selector: (row) => row.occupied },
        { name: "Vacant", selector: (row) => row.vacant },
        { name: "Occupancy %", selector: (row) => row.occupancy },
      ];

      const summaryData = [
        { total, occupied, vacant: vacantTotal, occupancy },
      ];

      return (
        <div className="border-l-2 border-blue-700 bg-stone-50 p-4">
          <p className="section-label mb-3">— Occupancy —</p>
          <DataTable
            customStyles={editorialTableStyles}
            columns={summaryColumns}
            data={summaryData}
            highlightOnHover
            striped
            responsive
          />
        </div>
      );
    }
  };

  const summary = {
    properties: properties.length,
    units: properties.reduce((s, p) => s + Number(p.total_units || 0), 0),
    blocks: properties.reduce((s, p) => s + (p.blocks?.length || 0), 0),
  };

  return (
    <div className="space-y-5 p-3 sm:p-6">

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Portfolio —</p>
          <h1
            className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Properties
          </h1>
          <p className="mt-1 text-sm text-black/55">
            All properties in your portfolio. Expand a row to see blocks and
            occupancy.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            + Add Property
          </button>
        )}
      </header>


      {!loading && properties.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-stone-200 bg-stone-200">
          <div className="bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Properties
            </p>
            <p
              className="mt-1 text-lg font-black tabular-nums text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.properties}
            </p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Blocks
            </p>
            <p
              className="mt-1 text-lg font-black tabular-nums text-blue-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.blocks}
            </p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Total Units
            </p>
            <p
              className="mt-1 text-lg font-black tabular-nums text-blue-700"
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
        <DataTable
          customStyles={editorialTableStyles}
          columns={columns}
          data={properties}
          pagination
          highlightOnHover
          responsive
          striped
          expandableRows
          expandableRowsComponent={ExpandedComponent}
        />
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
