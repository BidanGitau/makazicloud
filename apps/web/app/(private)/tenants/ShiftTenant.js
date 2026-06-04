"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Units, Tenants } from "@/app/_lib/repositories";
import { invalidateFormDataCache, useFormData } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  SelectField,
  SubmitButton,
  useWatch,
  useFormContext,
} from "@/app/_components/forms";
import { VACANT_UNIT_STATUSES } from "./utils/tenantFormConfig";

const shiftSchema = z.object({
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().min(1, "Choose a new unit"),
});

export default function ShiftTenant({ tenant, onSuccess }) {


  const { properties, blocks } = useFormData();

  const handleSubmit = async (values) => {
    const tenantId = tenant.tenant_id || tenant.id;
    const oldUnitId =
      tenant.unit_id && typeof tenant.unit_id === "object"
        ? tenant.unit_id.id
        : tenant.unit_id;

    try {
      if (oldUnitId) {
        await Units.update(oldUnitId, { status: "vacant" });
      }
      await Tenants.update(tenantId, { unit_id: values.unit_id });
      invalidateFormDataCache();
      showToast.success(`${tenant.full_name} shifted successfully!`);
      onSuccess?.();
    } catch (err) {
      console.error("Shift failed:", err);
      showToast.error("Failed to shift tenant");
      throw err;
    }
  };

  return (
    <AppForm
      schema={shiftSchema}
      defaultValues={{ property_id: "", block_id: "", unit_id: "" }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="border-l-2 border-blue-700 bg-blue-50 p-4">
        <p className="section-label !text-blue-700">— Shifting out —</p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          <span className="text-black/55">Name</span>
          <span className="font-bold text-black">{tenant.full_name}</span>
          <span className="text-black/55">Property</span>
          <span className="font-bold text-black">
            {tenant.property_name || "—"}
          </span>
          <span className="text-black/55">Block</span>
          <span className="font-bold text-black">
            {tenant.block?.name || "—"}
          </span>
          <span className="text-black/55">Unit</span>
          <span className="font-bold text-blue-700">
            {tenant.unit_number || "—"}{" "}
            <span className="text-black/40">
              ({tenant.unit_type || "unknown"})
            </span>
          </span>
          <span className="text-black/55">Rent</span>
          <span
            className="font-mono font-bold text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            KSh {Number(tenant.rent_amount || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <FieldSection title="Move to" columns={2}>
        <SelectField
          name="property_id"
          label="New Property"
          placeholder="Select new property"
          showSearch
          required
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          className="md:col-span-2"
        />
        <BlockSelect blocks={blocks} />
        <UnitSelect />
      </FieldSection>

      <SubmitButton>Confirm Shift</SubmitButton>
    </AppForm>
  );
}

function BlockSelect({ blocks }) {
  const propertyId = useWatch({ name: "property_id" });
  const propertyBlocks = useMemo(
    () => blocks.filter((b) => b.property_id === propertyId),
    [blocks, propertyId],
  );
  if (propertyBlocks.length === 0) return null;
  return (
    <SelectField
      name="block_id"
      label="New Block"
      placeholder="Select new block"
      options={propertyBlocks.map((b) => ({ value: b.id, label: b.name }))}
    />
  );
}

function UnitSelect() {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!propertyId) {
      setUnits([]);
      return;
    }
    setLoading(true);
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
        setUnits(rows || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("ShiftTenant: failed to load units", err);
          setUnits([]);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [propertyId, blockId]);


  useEffect(() => {
    setValue("unit_id", "");
  }, [propertyId, blockId, setValue]);

  return (
    <SelectField
      name="unit_id"
      label="New Unit"
      placeholder={
        !propertyId
          ? "Select property first"
          : loading
            ? "Loading units…"
            : units.length === 0
              ? "No vacant units"
              : "Select vacant unit"
      }
      required
      disabled={!propertyId || loading}
      loading={loading}
      options={units.map((u) => ({
        value: u.id,
        label: u.unit_number || u.name,
      }))}
    />
  );
}
