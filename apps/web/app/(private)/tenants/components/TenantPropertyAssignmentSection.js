import { useEffect, useMemo, useState } from "react";
import { Units } from "@/app/_lib/repositories";
import {
  FieldSection,
  SelectField,
  useFormContext,
  useWatch,
} from "@/app/_components/forms";
import { VACANT_UNIT_STATUSES } from "../utils/tenantFormConfig";

export default function TenantPropertyAssignmentSection({
  properties,
  blocks,
  unitsCache,
  cacheUnits,
  currentUnitId,
  isEditMode,
}) {
  const { setValue, getFieldState } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const unitId = useWatch({ name: "unit_id" });
  const [vacantUnits, setVacantUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const propertyBlocks = useMemo(
    () => blocks.filter((block) => block.property_id === propertyId),
    [blocks, propertyId],
  );

  useEffect(() => {
    if (!propertyId) {
      setVacantUnits([]);
      return;
    }
    if (propertyBlocks.length > 0 && !blockId) {
      setVacantUnits([]);
      return;
    }
    setUnitsLoading(true);
    const controller = new AbortController();
    Units.getAll({
      match: {
        property_id: propertyId,
        ...(blockId ? { block_id: blockId } : {}),
      },
      filter: [
        { column: "status", operator: "in", value: VACANT_UNIT_STATUSES },
      ],
      order: { column: "unit_number", ascending: true },
      signal: controller.signal,
    })
      .then((rows) => {
        const list = rows || [];
        cacheUnits(list);
        setVacantUnits(list);
        setUnitsLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("TenantForm: failed to load units", err);
          setVacantUnits([]);
          setUnitsLoading(false);
        }
      });
    return () => controller.abort();
  }, [propertyId, blockId, propertyBlocks.length, cacheUnits]);

  const availableUnits = useMemo(() => {
    const map = new Map(vacantUnits.map((unit) => [unit.id, unit]));
    if (currentUnitId && unitsCache[currentUnitId] && !map.has(currentUnitId)) {
      map.set(currentUnitId, unitsCache[currentUnitId]);
    }
    return Array.from(map.values());
  }, [vacantUnits, currentUnitId, unitsCache]);

  useEffect(() => {
    const unit = unitsCache[unitId];
    if (!unit) return;

    setValue("rent_amount", unit.rent_amount || "", { shouldDirty: false });
    setValue("deposit_amount", unit.deposit_amount || unit.rent_amount || "", {
      shouldDirty: false,
    });
    if (!isEditMode && !getFieldState("initial_payment").isDirty) {
      setValue("initial_payment", unit.rent_amount || "", {
        shouldDirty: false,
      });
    }
  }, [getFieldState, isEditMode, unitId, unitsCache, setValue]);

  return (
    <FieldSection title="Property Assignment" columns={2}>
      <SelectField
        name="property_id"
        label="Property"
        placeholder="Select property"
        showSearch
        required
        disabled={isEditMode}
        options={properties.map((property) => ({
          value: property.id,
          label: property.name,
        }))}
        className="md:col-span-2"
        onValueChange={() => {
          setValue("block_id", "");
          setValue("unit_id", "");
        }}
      />
      {propertyBlocks.length > 0 && (
        <SelectField
          name="block_id"
          label="Block"
          placeholder="Select block"
          disabled={isEditMode}
          options={propertyBlocks.map((block) => ({
            value: block.id,
            label: block.name,
          }))}
          onValueChange={() => setValue("unit_id", "")}
        />
      )}
      <SelectField
        name="unit_id"
        label="Unit"
        placeholder={
          !propertyId
            ? "Select property first"
            : propertyBlocks.length > 0 && !blockId
              ? "Select block first"
              : unitsLoading
                ? "Loading units..."
                : availableUnits.length === 0
                  ? "No vacant units"
                  : "Select unit"
        }
        required
        disabled={
          isEditMode ||
          !propertyId ||
          unitsLoading ||
          (propertyBlocks.length > 0 && !blockId)
        }
        loading={unitsLoading}
        options={availableUnits.map((unit) => ({
          value: unit.id,
          label: unit.unit_number || unit.name,
        }))}
        className={propertyBlocks.length > 0 ? "" : "md:col-span-2"}
      />
    </FieldSection>
  );
}
