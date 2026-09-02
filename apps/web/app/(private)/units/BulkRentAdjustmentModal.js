"use client";

import { z } from "zod";
import { useFormData } from "@/app/_hooks/useFormData";
import { applyRentAdjustment, defaultEffectiveMonth, minEffectiveMonth, isEffectiveMonthAllowed, EFFECTIVE_MONTH_ERROR } from "@/app/_lib/api/units";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  NumberField,
  SelectField,
  SubmitButton,
  TextField,
  useWatch,
} from "@/app/_components/forms";

const schema = z
  .object({
    scope: z.enum(["all", "property"]),
    property_id: z.string().optional(),
    mode: z.enum(["set", "increase_amount", "increase_percent"]),
    value: z.coerce.number().min(0, "Enter a valid amount"),
    effective_month: z
      .string()
      .min(1, "Choose the effective month")
      .refine(isEffectiveMonthAllowed, EFFECTIVE_MONTH_ERROR),
  })
  .superRefine((values, ctx) => {
    if (values.scope === "property" && !values.property_id) {
      ctx.addIssue({
        code: "custom",
        path: ["property_id"],
        message: "Choose a property",
      });
    }
    if (values.mode === "increase_percent" && values.value > 1000) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage is too large",
      });
    }
  });

const MODE_OPTIONS = [
  { value: "increase_amount", label: "Increase by amount (KSh)" },
  { value: "increase_percent", label: "Increase by percentage (%)" },
  { value: "set", label: "Set all units to the same rent (KSh)" },
];

export default function BulkRentAdjustmentModal({ onSuccess }) {
  const { properties } = useFormData();

  const handleSubmit = async (values) => {
    try {
      const result = await applyRentAdjustment({
        scope: values.scope === "property" ? "property" : "all",
        propertyId: values.scope === "property" ? values.property_id : undefined,
        mode: values.mode,
        value: Number(values.value),
        effectiveMonth: values.effective_month,
      });
      showToast.success(result.message || "Rent updated");
      onSuccess?.(result);
    } catch (err) {
      showToast.error(err?.message || "Failed to update rent");
      throw err;
    }
  };

  return (
    <AppForm
      schema={schema}
      defaultValues={{
        scope: "all",
        property_id: "",
        mode: "increase_amount",
        value: "",
        effective_month: defaultEffectiveMonth(),
      }}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Rent Adjustment —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bulk rent adjustment
        </h2>
        <p className="mt-2 text-sm text-black/55">
          Updates unit rent and open arrears from the chosen month forward. Past
          cleared months stay unchanged.
        </p>
      </header>

      <FieldSection title="Scope" columns={1}>
        <SelectField
          name="scope"
          label="Apply to"
          options={[
            { value: "all", label: "All properties" },
            { value: "property", label: "One property" },
          ]}
          required
          allowClear={false}
        />
        <PropertyField properties={properties} />
      </FieldSection>

      <FieldSection title="Adjustment" columns={2}>
        <SelectField
          name="mode"
          label="Adjustment type"
          options={MODE_OPTIONS}
          required
          allowClear={false}
          className="md:col-span-2"
        />
        <AdjustmentValueField />
        <TextField
          name="effective_month"
          label="Effective from month"
          type="month"
          required
          min={minEffectiveMonth()}
          helper="Must be a future month. Tenants are billed at the new rent from that month onward."
        />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Apply Rent Adjustment
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function PropertyField({ properties }) {
  const scope = useWatch({ name: "scope" });
  if (scope !== "property") return null;

  return (
    <SelectField
      name="property_id"
      label="Property"
      placeholder="Select property"
      showSearch
      required
      options={properties.map((property) => ({
        value: property.id,
        label: property.name,
      }))}
    />
  );
}

function AdjustmentValueField() {
  const mode = useWatch({ name: "mode" });
  const label =
    mode === "increase_percent"
      ? "Increase (%)"
      : mode === "set"
        ? "New rent (KSh)"
        : "Increase amount (KSh)";

  return (
    <NumberField
      name="value"
      label={label}
      min={0}
      required
      placeholder="0"
    />
  );
}
