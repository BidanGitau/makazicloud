"use client";

import { useEffect } from "react";
import { z } from "zod";
import { UtilityUnitAssignments } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { SERVICE_TYPES } from "./utilityConstants";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  NumberField,
  SelectField,
  SubmitButton,
  useFormContext,
  useWatch,
} from "@/app/_components/forms";

const serviceOptions = SERVICE_TYPES.map((t) => ({
  value: t.id,
  label: t.name,
}));

const assignmentSchema = z.object({
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().min(1, "Choose a unit"),
  service_type: z.string().min(1, "Choose a service type"),
  billing_type: z.enum(["flat_rate", "metered"]).default("flat_rate"),
  monthly_cost: z.union([z.coerce.number(), z.literal("")]).optional(),
  rate_per_unit: z.union([z.coerce.number(), z.literal("")]).optional(),
});

const emptyForm = {
  property_id: "",
  block_id: "",
  unit_id: "",
  service_type: "",
  billing_type: "flat_rate",
  monthly_cost: "",
  rate_per_unit: "",
};

export default function AssignmentForm({ properties, onSuccess }) {
  const handleSubmit = async (values) => {
    try {
      await UtilityUnitAssignments.create({
        property_id: values.property_id,
        unit_id: values.unit_id,
        service_type: values.service_type,
        billing_type: values.billing_type,
        monthly_cost:
          values.billing_type === "flat_rate" && values.monthly_cost
            ? Number(values.monthly_cost)
            : null,
        rate_per_unit:
          values.billing_type === "metered" && values.rate_per_unit
            ? Number(values.rate_per_unit)
            : null,
        is_active: true,
      });
      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to assign service");
      throw err;
    }
  };

  return (
    <AppForm
      schema={assignmentSchema}
      defaultValues={emptyForm}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Service Assignment —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Assign service
        </h2>
      </header>

      <FieldSection title="Where" columns={2}>
        <SelectField
          name="property_id"
          label="Property"
          placeholder="Select property"
          showSearch
          required
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          className="md:col-span-2"
        />
        <BlockUnitFields />
      </FieldSection>

      <FieldSection title="Service" columns={2}>
        <SelectField
          name="service_type"
          label="Service type"
          placeholder="Select type"
          required
          options={serviceOptions}
        />
        <SelectField
          name="billing_type"
          label="Billing type"
          options={[
            { value: "flat_rate", label: "Flat rate" },
            { value: "metered", label: "Metered" },
          ]}
          allowClear={false}
        />
        <BillingAmountField />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Assign Service
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function BlockUnitFields() {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const { propertyBlocks, hasBlocks, propertyUnits } = usePropertyStructure(
    propertyId,
    blockId,
  );

  useEffect(() => {
    setValue("block_id", "");
    setValue("unit_id", "");
  }, [propertyId, setValue]);

  useEffect(() => {
    setValue("unit_id", "");
  }, [blockId, setValue]);

  return (
    <>
      {hasBlocks && (
        <SelectField
          name="block_id"
          label="Block"
          placeholder="Select block"
          required
          options={propertyBlocks.map((b) => ({ value: b.id, label: b.name }))}
        />
      )}
      <SelectField
        name="unit_id"
        label="Unit"
        placeholder={
          !propertyId
            ? "Select property first"
            : hasBlocks && !blockId
              ? "Select block first"
              : "Select unit"
        }
        required
        disabled={!propertyId || (hasBlocks && !blockId)}
        options={propertyUnits.map((u) => ({
          value: u.id,
          label: u.unit_number,
        }))}
        className={hasBlocks ? "" : "md:col-span-2"}
      />
    </>
  );
}

function BillingAmountField() {
  const billingType = useWatch({ name: "billing_type" });
  if (billingType === "metered") {
    return (
      <NumberField
        name="rate_per_unit"
        label="Rate per unit (KSh)"
        min={0}
        placeholder="e.g. 85"
      />
    );
  }
  return (
    <NumberField
      name="monthly_cost"
      label="Monthly cost (KSh)"
      min={0}
      placeholder="0"
    />
  );
}
