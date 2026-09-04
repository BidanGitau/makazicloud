"use client";

import { z } from "zod";
import { applyRentAdjustment, defaultEffectiveMonth, minEffectiveMonth, isEffectiveMonthAllowed, EFFECTIVE_MONTH_ERROR } from "@/app/_lib/api/units";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  NumberField,
  SubmitButton,
  TextField,
} from "@/app/_components/forms";
import { formatCurrency } from "@/app/_lib/formatters";

const schema = z.object({
  rent_amount: z.coerce.number().min(0, "Enter a valid rent amount"),
  effective_month: z
    .string()
    .min(1, "Choose the effective month")
    .refine(isEffectiveMonthAllowed, EFFECTIVE_MONTH_ERROR),
});

export default function UnitRentAdjustmentModal({ unit, onSuccess }) {
  const handleSubmit = async (values) => {
    try {
      const result = await applyRentAdjustment({
        scope: "unit",
        unitIds: [unit.id],
        mode: "set",
        value: Number(values.rent_amount),
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
        rent_amount: unit?.rent_amount ?? "",
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
          Rent adjustment for #{unit?.unit_number}
        </h2>
        <p className="mt-2 text-sm text-black/55">
          Current rent: {formatCurrency(unit?.rent_amount || 0)}. Open arrears
          from the effective month onward will use the new amount. The occupying
          tenant is sent an SMS with the change.
        </p>
      </header>

      <FieldSection title="New rent" columns={1}>
        <NumberField
          name="rent_amount"
          label="Rent amount (KSh)"
          min={0}
          required
        />
        <TextField
          name="effective_month"
          label="Effective from month"
          type="month"
          required
          min={minEffectiveMonth()}
          helper="Must be a future month. Billing from that month forward uses the new rent."
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
