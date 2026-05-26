"use client";

import { z } from "zod";
import { Building2, Layers, CreditCard, Plus, Trash2 } from "lucide-react";
import { Properties, Blocks } from "@/app/_lib/repositories";
import { invalidateFormDataCache } from "@/app/_hooks/useFormData";
import { useAuth } from "@/app/_context/AuthContext";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  NumberField,
  SelectField,
  SwitchField,
  SubmitButton,
  useFieldArray,
  useFormContext,
  useWatch,
} from "@/app/_components/forms";

const billOptions = [
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "garbage", label: "Garbage" },
  { value: "security", label: "Security" },
  { value: "internet", label: "Internet" },
  { value: "service_charge", label: "Service charge" },
  { value: "other", label: "Other" },
];

const blockSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Block name is required"),
  total_units: z.coerce.number().min(1, "Enter unit count"),
});

const recurringBillSchema = z.object({
  bill: z.string().optional(),
  billing_type: z.enum(["flat_rate", "metered"]).default("flat_rate"),
  amount: z.coerce.number().optional(),
  rate_per_unit: z.coerce.number().optional(),
});

const propertySchema = z
  .object({
    name: z.string().min(1, "Property name is required"),
    address: z.string().optional(),
    ownerName: z.string().optional(),
    totalUnits: z
      .union([z.coerce.number().min(0), z.literal("")])
      .optional(),
    rentDueDay: z.coerce.number().int().min(1).max(28).default(5),
    recurringBills: z.array(recurringBillSchema).default([]),
    blocks: z.array(blockSchema).default([]),
    paymentInfo: z.object({
      bank: z.object({
        enabled: z.boolean(),
        account_name: z.string().optional(),
        account_number: z.string().optional(),
      }),
      mpesa: z.object({
        enabled: z.boolean(),
        paybill: z.string().optional(),
        account_number: z.string().optional(),
      }),
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.blocks.length && !data.totalUnits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalUnits"],
        message: "Enter total units or add blocks.",
      });
    }
    if (data.paymentInfo.mpesa.enabled && !data.paymentInfo.mpesa.paybill?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "mpesa", "paybill"],
        message: "Paybill number is required.",
      });
    }
    if (
      data.paymentInfo.bank.enabled &&
      !data.paymentInfo.bank.account_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "bank", "account_number"],
        message: "Account number is required.",
      });
    }
  });

const emptyForm = {
  name: "",
  address: "",
  ownerName: "",
  totalUnits: "",
  rentDueDay: 5,
  recurringBills: [],
  blocks: [],
  paymentInfo: {
    bank: { enabled: false, account_name: "", account_number: "" },
    mpesa: { enabled: false, paybill: "", account_number: "" },
  },
};

const propertyToForm = (property) => {
  if (!property) return null;
  const pi = property.payment_info || {};
  return {
    name: property.name || "",
    address: property.address || "",
    ownerName: property.owner_name || "",
    totalUnits: property.unit_count || property.total_units || "",
    rentDueDay: property.rent_due_day ?? 5,
    recurringBills: property.recurring_bills || [],
    blocks: (property.blocks || []).map((block) => ({
      id: block.id,
      name: block.name,
      total_units: block.total_units || block.unit_count || "",
    })),
    paymentInfo: {
      bank: {
        enabled: Boolean(pi.bank),
        account_name: pi.bank?.account_name || "",
        account_number: pi.bank?.account_number || "",
      },
      mpesa: {
        enabled: Boolean(pi.mpesa),
        paybill: pi.mpesa?.paybill || "",
        account_number: pi.mpesa?.account_number || "",
      },
    },
  };
};

export default function PropertyForm({ property = null, onSuccess }) {
  const { user } = useAuth();

  const handleSubmit = async (values) => {
    const computedUnitCount = values.blocks.length
      ? values.blocks.reduce((sum, b) => sum + Number(b.total_units || 0), 0)
      : values.totalUnits
        ? Number(values.totalUnits)
        : 0;

    const payload = {
      name: values.name || "Unnamed Property",
      address: values.address || null,
      owner_name: values.ownerName || null,
      recurring_bills: (values.recurringBills || [])
        .filter((b) => b.bill || b.amount || b.rate_per_unit)
        .map((b) => ({
          bill: b.bill || null,
          billing_type: b.billing_type || "flat_rate",
          amount:
            b.billing_type === "metered" ? 0 : b.amount ? Number(b.amount) : 0,
          rate_per_unit:
            b.billing_type === "metered"
              ? b.rate_per_unit
                ? Number(b.rate_per_unit)
                : 0
              : null,
        })),
      unit_count: computedUnitCount,
      rent_due_day: Number(values.rentDueDay) || 5,
      user_id: user?.id || null,
      payment_info: {
        ...(values.paymentInfo.bank.enabled
          ? {
              bank: {
                account_name: values.paymentInfo.bank.account_name || null,
                account_number: values.paymentInfo.bank.account_number || null,
              },
            }
          : {}),
        ...(values.paymentInfo.mpesa.enabled
          ? {
              mpesa: {
                paybill: values.paymentInfo.mpesa.paybill || null,
                account_number: values.paymentInfo.mpesa.account_number || null,
              },
            }
          : {}),
      },
    };

    try {
      let saved;
      if (property?.id) {
        saved = await Properties.update(property.id, payload);
        const submittedBlockIds = new Set(
          values.blocks.map((block) => block.id).filter(Boolean),
        );
        const removedBlocks = (property.blocks || []).filter(
          (block) => !submittedBlockIds.has(block.id),
        );

        for (const block of removedBlocks) {
          if (block.units?.length) {
            showToast.error(
              `${block.name} still has units attached. Move or delete those units before removing the block.`,
            );
            continue;
          }
          await Blocks.remove(block.id);
        }

        for (const b of values.blocks) {
          const blockPayload = {
            property_id: property.id,
            name: b.name,
            unit_count: Number(b.total_units) || 0,
          };
          if (b.id) {
            await Blocks.update(b.id, blockPayload);
          } else {
            await Blocks.create(blockPayload);
          }
        }
      } else {
        saved = await Properties.create(payload);
        for (const b of values.blocks) {
          await Blocks.create({
            property_id: saved.id,
            name: b.name,
            unit_count: Number(b.total_units) || 0,
          });
        }
      }

      invalidateFormDataCache();
      onSuccess?.();
    } catch (err) {
      console.error("Error saving property:", err);
      showToast.error(err?.message || "Failed to save property");
      throw err;
    }
  };

  return (
    <AppForm
      schema={propertySchema}
      defaultValues={emptyForm}
      values={propertyToForm(property)}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Property —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {property ? "Update property" : "Create property"}
        </h2>
      </header>

      <FieldSection title="Property Information" columns={2}>
        <TextField
          name="name"
          label="Property name"
          icon={Building2}
          required
          className="md:col-span-2"
        />
        <TextField name="address" label="Address" />
        <TextField name="ownerName" label="Owner name" />
        <NumberField
          name="rentDueDay"
          label="Rent due day"
          min={1}
          max={28}
          helper="Day of the month rent is due (1–28)"
        />
        <TotalUnitsField />
      </FieldSection>

      <RecurringBillsSection />

      <FieldSection title="Payment Details" columns={1}>
        <PaymentDetailsSection />
      </FieldSection>

      <BlocksSection />

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {property ? "Update Property" : "Save Property"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}


function TotalUnitsField() {
  const blocks = useWatch({ name: "blocks" }) || [];
  if (blocks.length > 0) return null;
  return (
    <NumberField
      name="totalUnits"
      label="Total units"
      min={0}
      className="md:col-span-2"
    />
  );
}

function RecurringBillsSection() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "recurringBills" });

  return (
    <FieldSection title="Recurring Bills" columns={1}>
      {fields.length === 0 ? (
        <p className="text-sm text-black/55">No recurring bills added yet.</p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, i) => (
            <BillRow key={field.id} index={i} onRemove={() => remove(i)} />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          append({ bill: "", billing_type: "flat_rate", amount: "", rate_per_unit: "" })
        }
        className="inline-flex items-center gap-2 self-start border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add bill
      </button>
    </FieldSection>
  );
}

function BillRow({ index, onRemove }) {
  const billingType =
    useWatch({ name: `recurringBills.${index}.billing_type` }) || "flat_rate";

  return (
    <li className="space-y-2 border border-stone-200 bg-stone-50 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="md:col-span-3">
          <SelectField
            name={`recurringBills.${index}.bill`}
            placeholder="Choose recurring bill"
            options={billOptions}
            allowClear={false}
          />
        </div>
        <BillingTypeToggle index={index} />
      </div>
      <div className="flex items-center gap-3">
        {billingType === "metered" ? (
          <NumberField
            name={`recurringBills.${index}.rate_per_unit`}
            placeholder="Rate per unit (KSh)"
            className="flex-1"
          />
        ) : (
          <NumberField
            name={`recurringBills.${index}.amount`}
            placeholder="Amount (KSh)"
            className="flex-1"
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 hover:text-red-700"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function BillingTypeToggle({ index }) {
  const { setValue } = useFormContext();
  const fieldName = `recurringBills.${index}.billing_type`;
  const current = useWatch({ name: fieldName }) || "flat_rate";
  return (
    <div className="flex border border-stone-300 overflow-hidden md:col-span-2">
      {["flat_rate", "metered"].map((type, i) => (
        <button
          key={type}
          type="button"
          onClick={() => setValue(fieldName, type, { shouldDirty: true })}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
            current === type
              ? "bg-blue-700 text-white"
              : "bg-white text-black/70 hover:bg-stone-50"
          } ${i > 0 ? "border-l border-stone-300" : ""}`}
        >
          {type === "flat_rate" ? "Flat rate" : "Metered"}
        </button>
      ))}
    </div>
  );
}

function PaymentDetailsSection() {
  const bankEnabled = useWatch({ name: "paymentInfo.bank.enabled" });
  const mpesaEnabled = useWatch({ name: "paymentInfo.mpesa.enabled" });

  return (
    <div className="space-y-4">
      <div className="border border-stone-200">
        <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
          <SwitchField
            name="paymentInfo.bank.enabled"
            label="Bank account"
            description="Receive rent via bank transfer"
          />
        </div>
        {bankEnabled && (
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <TextField
              name="paymentInfo.bank.account_name"
              label="Account name"
              placeholder="e.g. John Properties Ltd"
            />
            <TextField
              name="paymentInfo.bank.account_number"
              label="Account number"
              placeholder="e.g. 1234567890"
              required
            />
          </div>
        )}
      </div>

      <div className="border border-stone-200">
        <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
          <SwitchField
            name="paymentInfo.mpesa.enabled"
            label="M-Pesa Paybill"
            description="Accept rent via M-Pesa"
          />
        </div>
        {mpesaEnabled && (
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <TextField
              name="paymentInfo.mpesa.paybill"
              label="Paybill number"
              placeholder="e.g. 522522"
              required
            />
            <TextField
              name="paymentInfo.mpesa.account_number"
              label="Account number"
              placeholder="e.g. tenant unit number"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BlocksSection() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "blocks" });

  return (
    <FieldSection
      title="Blocks (Optional)"
      description="Organise units into blocks for cleaner reporting"
      columns={1}
    >
      {fields.length === 0 ? (
        <button
          type="button"
          onClick={() => append({ name: "", total_units: "" })}
          className="inline-flex items-center gap-2 self-start border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add block
        </button>
      ) : (
        <>
          <ul className="space-y-3">
            {fields.map((field, i) => (
              <li
                key={field.id}
                className="grid grid-cols-1 gap-3 border border-stone-200 bg-stone-50 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <TextField
                  name={`blocks.${i}.name`}
                  placeholder="Block name"
                  icon={Layers}
                />
                <NumberField
                  name={`blocks.${i}.total_units`}
                  placeholder="Units"
                  min={1}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="flex-shrink-0 self-center text-black/55 hover:text-red-600"
                  aria-label="Remove block"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => append({ name: "", total_units: "" })}
            className="inline-flex items-center gap-2 self-start border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add block
          </button>
        </>
      )}
    </FieldSection>
  );
}
