"use client";

import { z } from "zod";
import { Plus, Trash2, Wrench } from "lucide-react";
import { Maintenance } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { CATEGORIES, PRIORITIES, STATUSES } from "./maintenanceConstants";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  DateField,
  SwitchField,
  SubmitButton,
  useFormContext,
  useWatch,
  useFieldArray,
} from "@/app/_components/forms";

const today = () => new Date().toISOString().split("T")[0];

const categoryOptions = CATEGORIES.map((c) => ({
  value: c.id,
  label: c.label,
}));
const priorityOptions = PRIORITIES.map((p) => ({
  value: p.id,
  label: p.label,
}));
const statusOptions = STATUSES.map((s) => ({ value: s.id, label: s.label }));

const itemSchema = z.object({
  category: z.string().min(1, "Choose a category"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.string().default("medium"),
  status: z.string().default("pending"),
  reported_date: z.string().optional(),
  completed_date: z.string().optional(),
  estimated_cost: z.union([z.coerce.number(), z.literal("")]).optional(),
  actual_cost: z.union([z.coerce.number(), z.literal("")]).optional(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
  is_tenant_fault: z.boolean().default(false),
});

const formSchema = z.object({
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().optional().or(z.literal("")),
  items: z.array(itemSchema).min(1, "Add at least one request"),
});

const blankItem = () => ({
  category: "",
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  reported_date: today(),
  completed_date: "",
  estimated_cost: "",
  actual_cost: "",
  vendor_name: "",
  notes: "",
  is_tenant_fault: false,
});

export default function MaintenanceForm({ initialData, onSuccess }) {
  const isEdit = Boolean(initialData?.id);

  const defaultValues = {
    property_id: initialData?.property_id || "",
    block_id: initialData?.block_id || "",
    unit_id: initialData?.unit_id || "",
    items: isEdit
      ? [
          {
            ...blankItem(),
            category: initialData.category || "",
            title: initialData.title || "",
            description: initialData.description ?? "",
            priority: initialData.priority || "medium",
            status: initialData.status || "pending",
            reported_date: initialData.reported_date ?? today(),
            completed_date: initialData.completed_date ?? "",
            estimated_cost: initialData.estimated_cost ?? "",
            actual_cost: initialData.actual_cost ?? "",
            vendor_name: initialData.vendor_name ?? "",
            notes: initialData.notes ?? "",
            is_tenant_fault: initialData.is_tenant_fault ?? false,
          },
        ]
      : [blankItem()],
  };

  const handleSubmit = async (values) => {
    const base = {
      property_id: values.property_id,
      block_id: values.block_id || null,
      unit_id: values.unit_id || null,
    };
    const toPayload = (item) => ({
      ...base,
      category: item.category,
      title: item.title,
      description: item.description || null,
      priority: item.priority,
      status: item.status,
      reported_date: item.reported_date || null,
      completed_date: item.completed_date || null,
      estimated_cost:
        item.estimated_cost === "" ? null : Number(item.estimated_cost),
      actual_cost: item.actual_cost === "" ? null : Number(item.actual_cost),
      vendor_name: item.vendor_name || null,
      notes: item.notes || null,
      is_tenant_fault: item.is_tenant_fault,
    });

    try {
      if (isEdit) {
        await Maintenance.update(initialData.id, toPayload(values.items[0]));
      } else {
        await Maintenance.create(values.items.map(toPayload));
      }
      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to save");
      throw err;
    }
  };

  return (
    <AppForm
      schema={formSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Maintenance —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isEdit ? "Update Request" : "Log Requests"}
        </h2>
      </header>

      <LocationSection />
      <ItemsSection isEdit={isEdit} />

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {isEdit ? "Update Request" : "Save"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function LocationSection() {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const { properties, propertyBlocks, hasBlocks, propertyUnits } =
    usePropertyStructure(propertyId, blockId);

  return (
    <FieldSection title="Location" columns={2}>
      <SelectField
        name="property_id"
        label="Property"
        placeholder="Select property"
        showSearch
        required
        options={properties.map((p) => ({ value: p.id, label: p.name }))}
        className="md:col-span-2"
      />
      {hasBlocks && (
        <>
          <SelectField
            name="block_id"
            label="Block"
            placeholder="All blocks"
            options={propertyBlocks.map((b) => ({
              value: b.id,
              label: b.name,
            }))}
          />
          <SelectField
            name="unit_id"
            label="Unit"
            placeholder="All units"
            disabled={propertyUnits.length === 0}
            options={propertyUnits.map((u) => ({
              value: u.id,
              label: `Unit ${u.unit_number}`,
            }))}
          />
        </>
      )}
      {!hasBlocks && propertyId && propertyUnits.length > 0 && (
        <SelectField
          name="unit_id"
          label="Unit"
          placeholder="All units"
          options={propertyUnits.map((u) => ({
            value: u.id,
            label: `Unit ${u.unit_number}`,
          }))}
          className="md:col-span-2"
        />
      )}
    </FieldSection>
  );
}

function ItemsSection({ isEdit }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <>
      {fields.map((field, i) => (
        <div
          key={field.id}
          className="relative border border-stone-200 p-5 sm:p-6"
        >
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-4 top-4 text-black/55 hover:text-red-600"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          )}
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
            <p className="section-label">— Request {i + 1} —</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              name={`items.${i}.category`}
              label="Category"
              placeholder="Select category"
              required
              options={categoryOptions}
            />
            <SelectField
              name={`items.${i}.priority`}
              label="Priority"
              options={priorityOptions}
              allowClear={false}
            />
            <TextField
              name={`items.${i}.title`}
              label="Title"
              placeholder="e.g. Leaking pipe in Block A"
              required
              className="md:col-span-2"
            />
            <TextAreaField
              name={`items.${i}.description`}
              label="Description"
              rows={2}
              placeholder="Describe the issue…"
              className="md:col-span-2"
            />
            <SelectField
              name={`items.${i}.status`}
              label="Status"
              options={statusOptions}
              allowClear={false}
            />
            <TextField
              name={`items.${i}.vendor_name`}
              label="Vendor / Contractor"
              placeholder="e.g. ABC Plumbers"
            />
            <DateField
              name={`items.${i}.reported_date`}
              label="Reported Date"
            />
            <NumberField
              name={`items.${i}.actual_cost`}
              label="Cost (KSh)"
              min={0}
              placeholder="0.00"
            />
            <SwitchField
              name={`items.${i}.is_tenant_fault`}
              label="Tenant's fault"
              description="Cost deducted from deposit instead of property owner"
              className="md:col-span-2"
            />
            <TextAreaField
              name={`items.${i}.notes`}
              label="Notes"
              rows={2}
              placeholder="Additional notes…"
              className="md:col-span-2"
            />
          </div>
        </div>
      ))}

      {!isEdit && (
        <button
          type="button"
          onClick={() => append(blankItem())}
          className="inline-flex items-center gap-2 self-start border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add another item
        </button>
      )}
    </>
  );
}
