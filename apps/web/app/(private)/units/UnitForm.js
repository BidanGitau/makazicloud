"use client";

import { z } from "zod";
import { Units } from "@/app/_lib/repositories";
import { invalidateFormDataCache, useFormData } from "@/app/_hooks/useFormData";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  NumberField,
  SelectField,
  SubmitButton,
  useWatch,
} from "@/app/_components/forms";

const UNIT_TYPES = [
  { value: "single room", label: "Single Room" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "1BR", label: "1 Bedroom" },
  { value: "2BR", label: "2 Bedroom" },
  { value: "3BR", label: "3 Bedroom" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
];

const unitSchema = z.object({
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_number: z.string().min(1, "Unit number is required"),
  type: z.string().min(1, "Choose a unit type"),
  floor: z.string().optional(),
  rent_amount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  deposit_amount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
});

const emptyForm = {
  property_id: "",
  block_id: "",
  unit_number: "",
  type: "",
  floor: "",
  rent_amount: "",
  deposit_amount: "",
};

const unitToForm = (initialData) => {
  if (!initialData) return null;
  return {
    property_id: initialData.property_id || "",
    block_id: initialData.block_id || "",
    unit_number: initialData.unit_number || "",
    type: initialData.type || "",
    floor: initialData.floor == null ? "" : String(initialData.floor),
    rent_amount: initialData.rent_amount ?? "",
    deposit_amount: initialData.deposit_amount ?? "",
  };
};

export default function UnitForm({ initialData = null, onSuccess }) {
  const {
    properties,
    blocks: allBlocks,
    isLoading,
  } = useFormData();

  const isEditing = !!initialData;

  const handleSubmit = async (values) => {
    const propertyBlocks = allBlocks.filter((block) => block.property_id === values.property_id);
    if (propertyBlocks.length > 0 && !values.block_id) {
      showToast.error("Choose a block before adding a unit to this property.");
      throw new Error("Block is required for this property");
    }

    const payload = {
      property_id: values.property_id,
      unit_number: values.unit_number,
      type: values.type,
      floor: values.floor === "" || values.floor == null ? null : String(values.floor),
      status: initialData?.status || "vacant",
      rent_amount:
        values.rent_amount === "" ? null : Number(values.rent_amount),
      deposit_amount:
        values.deposit_amount === "" ? null : Number(values.deposit_amount),
      block_id: values.block_id || null,
    };
    try {
      if (isEditing) {
        await Units.update(initialData.id, payload);
      } else {
        await Units.create(payload);
      }
      invalidateFormDataCache();
      onSuccess?.(payload);
    } catch (err) {
      console.error("Error saving unit:", err);
      showToast.error(err?.message || "Failed to save unit");
      throw err;
    }
  };

  if (isLoading) return <p className="p-6 text-sm text-black/55">Loading…</p>;

  return (
    <AppForm
      schema={unitSchema}
      defaultValues={emptyForm}
      values={unitToForm(initialData)}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Unit —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isEditing ? "Update unit" : "Create unit"}
        </h2>
      </header>

      <FieldSection title="Location" columns={2}>
        <SelectField
          name="property_id"
          label="Property"
          placeholder="Select property"
          showSearch
          required
          className="md:col-span-2"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
        />
        <BlockField allBlocks={allBlocks} />
      </FieldSection>

      <FieldSection title="Details" columns={2}>
        <TextField name="unit_number" label="Unit number" required />
        <SelectField
          name="type"
          label="Type"
          placeholder="Select type"
          required
          options={UNIT_TYPES}
        />
        <TextField name="floor" label="Floor" placeholder="e.g. Ground, 1, Mezzanine" />
      </FieldSection>

      <FieldSection title="Pricing" columns={2}>
        <NumberField
          name="rent_amount"
          label="Rent amount (KSh)"
          min={0}
          placeholder="0"
        />
        <NumberField
          name="deposit_amount"
          label="Deposit amount (KSh)"
          min={0}
          placeholder="0"
        />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {isEditing ? "Update Unit" : "Save Unit"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function BlockField({ allBlocks }) {
  const propertyId = useWatch({ name: "property_id" });
  const filtered = allBlocks.filter((b) => b.property_id === propertyId);
  if (!propertyId || filtered.length === 0) return null;
  return (
    <SelectField
      name="block_id"
      label="Block"
      placeholder="Select block"
      required
      options={filtered.map((b) => ({ value: b.id, label: b.name }))}
    />
  );
}
