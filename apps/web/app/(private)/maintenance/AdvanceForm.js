"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Maintenance, OwnerAdvances } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { ADVANCE_STATUSES } from "./maintenanceConstants";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  DateField,
  SubmitButton,
  useWatch,
} from "@/app/_components/forms";

const today = () => new Date().toISOString().split("T")[0];

const statusOptions = ADVANCE_STATUSES.map((s) => ({
  value: s.id,
  label: s.label,
}));

const advanceSchema = z.object({
  property_id: z.string().min(1, "Choose a property"),
  purpose: z.string().min(1, "Purpose is required"),
  amount: z.coerce.number().min(0, "Enter a valid amount"),
  status: z.string().default("pending"),
  requested_date: z.string().optional(),
  disbursed_date: z.string().optional(),
  maintenance_id: z.string().optional(),
  notes: z.string().optional(),
});

export default function AdvanceForm({ initialData, onSuccess }) {
  const isEdit = Boolean(initialData?.id);

  const handleSubmit = async (values) => {
    const advanceDate =
      values.status === "disbursed" || values.status === "settled"
        ? values.disbursed_date || values.requested_date
        : values.requested_date;
    const descriptionParts = [
      values.purpose?.trim(),
      values.notes?.trim(),
      values.status && values.status !== "disbursed"
        ? `Status: ${values.status}`
        : null,
      values.maintenance_id ? `Maintenance ID: ${values.maintenance_id}` : null,
    ].filter(Boolean);

    const payload = {
      property_id: values.property_id,
      amount: Number(values.amount),
      description: descriptionParts.join("\n") || null,
      advance_date: advanceDate || null,
    };
    try {
      if (isEdit) {
        await OwnerAdvances.update(initialData.id, payload);
      } else {
        await OwnerAdvances.create(payload);
      }
      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to save");
      throw err;
    }
  };

  const defaultValues = {
    property_id: "",
    amount: "",
    purpose: "",
    status: "pending",
    requested_date: today(),
    disbursed_date: "",
    maintenance_id: "",
    notes: "",
    ...(initialData
      ? {
          ...initialData,
          requested_date: initialData.requested_date ?? today(),
          disbursed_date: initialData.disbursed_date ?? "",
          maintenance_id: initialData.maintenance_id ?? "",
          notes: initialData.notes ?? "",
        }
      : {}),
  };

  return (
    <AppForm
      schema={advanceSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Owner Advance —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isEdit ? "Update Advance" : "New Advance"}
        </h2>
      </header>

      <FieldSection title="Details" columns={2}>
        <PropertyField />
        <TextField
          name="purpose"
          label="Purpose"
          placeholder="e.g. Emergency roof repair advance"
          required
          className="md:col-span-2"
        />
        <NumberField name="amount" label="Amount (KSh)" min={0} required />
        <SelectField
          name="status"
          label="Status"
          options={statusOptions}
          allowClear={false}
        />
        <DateField name="requested_date" label="Requested Date" />
        <DateField name="disbursed_date" label="Disbursed Date" />
        <LinkedMaintenanceField />
        <TextAreaField
          name="notes"
          label="Notes"
          rows={2}
          placeholder="Additional notes…"
          className="md:col-span-2"
        />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {isEdit ? "Update Advance" : "Add Advance"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function PropertyField() {
  const { properties } = usePropertyStructure("", "");
  return (
    <SelectField
      name="property_id"
      label="Property"
      placeholder="Select property"
      showSearch
      required
      options={properties.map((p) => ({ value: p.id, label: p.name }))}
      className="md:col-span-2"
    />
  );
}

function LinkedMaintenanceField() {
  const propertyId = useWatch({ name: "property_id" });
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!propertyId) {
      setList([]);
      return;
    }
    Maintenance.getAll({
      match: { property_id: propertyId },
      select: "id, title",
    })
      .then(setList)
      .catch(console.error);
  }, [propertyId]);

  if (list.length === 0) return null;
  return (
    <SelectField
      name="maintenance_id"
      label="Linked Maintenance (optional)"
      placeholder="None"
      options={list.map((m) => ({ value: m.id, label: m.title }))}
      className="md:col-span-2"
    />
  );
}
