"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import ModalSlider from "@/app/_components/ModalSlider";
import UnitForm from "./UnitForm";
import BulkRentAdjustmentModal from "./BulkRentAdjustmentModal";
import UnitRentAdjustmentModal from "./UnitRentAdjustmentModal";
import TenantForm from "../tenants/TenantForm";
import { Properties, Units } from "@/app/_lib/repositories";
import { invalidateFormDataCache } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import LoadingSkeleton from "@/app/_components/LoadingSkeleton";
import { useAuth } from "@/app/_context/AuthContext";
import { toggleSetItem } from "@/app/_lib/set-utils";
import { buildUnitColumns } from "./components/unitColumns";
import PropertyUnitsSection from "./components/PropertyUnitsSection";
import UnitFilters from "./components/UnitFilters";

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
  const [filters, setFilters] = useState({
    statusFilter: "all",
    typeFilter: "all",
    searchQuery: "",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [unitToAssign, setUnitToAssign] = useState(null);
  const [bulkRentOpen, setBulkRentOpen] = useState(false);
  const [rentAdjustOpen, setRentAdjustOpen] = useState(false);
  const [unitToAdjust, setUnitToAdjust] = useState(null);
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

  const handleAssignUnit = (unit) => {
    setUnitToAssign(unit);
    setAssignOpen(true);
  };

  const handleAdjustRent = (unit) => {
    setUnitToAdjust(unit);
    setRentAdjustOpen(true);
  };

  const unitColumns = buildUnitColumns({
    canEdit,
    canDelete,
    canCreateTenant,
    onAssign: handleAssignUnit,
    onEdit: handleEdit,
    onAdjustRent: handleAdjustRent,
    onDelete: handleDelete,
  });

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

  return (
    <div className="space-y-2 p-1 sm:p-2">
      <header className="flex flex-wrap justify-end gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={() => setBulkRentOpen(true)}
            className="inline-flex items-center gap-1.5 border border-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:bg-blue-50"
          >
            Rent Adjustment
          </button>
        )}
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

      <UnitFilters
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      {loading ? (
        <LoadingSkeleton rows={6} columns={6} />
      ) : (
        <div className="space-y-1">
          {properties.map((property) => (
            <PropertyUnitsSection
              key={property.id || property.name}
              property={property}
              filters={filters}
              columns={unitColumns}
              noDataComponent={<NoUnitsMessage />}
              expandedProperties={expandedProperties}
              expandedBlocks={expandedBlocks}
              onToggleProperty={(key) => toggleSetItem(setExpandedProperties, key)}
              onToggleBlock={(key) => toggleSetItem(setExpandedBlocks, key)}
            />
          ))}
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
        isOpen={bulkRentOpen}
        onClose={() => setBulkRentOpen(false)}
        title="Rent Adjustment"
      >
        <BulkRentAdjustmentModal
          onSuccess={() => {
            setBulkRentOpen(false);
            fetchUnits();
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={rentAdjustOpen}
        onClose={() => {
          setRentAdjustOpen(false);
          setUnitToAdjust(null);
        }}
        title={`Rent Adjustment: ${unitToAdjust?.unit_number || ""}`}
      >
        {unitToAdjust && (
          <UnitRentAdjustmentModal
            unit={unitToAdjust}
            onSuccess={() => {
              setRentAdjustOpen(false);
              setUnitToAdjust(null);
              fetchUnits();
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
