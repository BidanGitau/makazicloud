"use client";

import { z } from "zod";
import { Building2, Layers, Plus, Trash2 } from "lucide-react";
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
  PaymentMethodFields,
  compactPaymentMethod,
  emptyPaymentMethod,
  normalizePaymentMethod,
  paymentMethodSchema,
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
  include_with_rent: z.boolean().default(true),
  payment_method: paymentMethodSchema.optional(),
});

const propertySchema = z
  .object({
    name: z.string().min(1, "Property name is required"),
    address: z.string().optional(),
    ownerName: z.string().optional(),
    totalUnits: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
    hasBlocks: z.boolean().default(false),
    rentDueDay: z.coerce.number().int().min(1).max(28).default(5),
    commissionRate: z.coerce.number().min(0).max(100).default(0),
    recurringBills: z.array(recurringBillSchema).default([]),
    blocks: z.array(blockSchema).default([]),
    paymentInfo: z.object({
      primary: paymentMethodSchema.default({}),
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
    if (data.hasBlocks && !data.blocks.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocks"],
        message: "Add at least one block or turn off blocks.",
      });
    }
    if (!data.hasBlocks && !data.totalUnits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalUnits"],
        message: "Enter total units.",
      });
    }
    if (
      data.paymentInfo.primary.type === "mpesa_paybill" &&
      !data.paymentInfo.primary.paybill?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "primary", "paybill"],
        message: "Paybill number is required.",
      });
    }
    if (
      data.paymentInfo.primary.type === "account" &&
      !data.paymentInfo.primary.account_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "primary", "account_number"],
        message: "Account number is required.",
      });
    }
    if (
      data.paymentInfo.primary.type === "phone" &&
      !data.paymentInfo.primary.phone_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "primary", "phone_number"],
        message: "Phone number is required.",
      });
    }
    if (
      data.paymentInfo.primary.type === "mpesa_till" &&
      !data.paymentInfo.primary.till_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInfo", "primary", "till_number"],
        message: "Till number is required.",
      });
    }
  });

const emptyForm = {
  name: "",
  address: "",
  ownerName: "",
  totalUnits: "",
  hasBlocks: false,
  rentDueDay: 5,
  commissionRate: 0,
  recurringBills: [],
  blocks: [],
  paymentInfo: {
    primary: {
      type: "",
      account_name: "",
      account_number: "",
      phone_number: "",
      paybill: "",
      till_number: "",
      instructions: "",
    },
    bank: { enabled: false, account_name: "", account_number: "" },
    mpesa: { enabled: false, paybill: "", account_number: "" },
  },
};

const propertyToForm = (property) => {
  if (!property) return null;
  const pi = property.payment_info || {};
  const primaryPayment =
    pi.primary ||
    (pi.mpesa
      ? {
          type: "mpesa_paybill",
          paybill: pi.mpesa.paybill,
          account_number: pi.mpesa.account_number,
        }
      : pi.bank
        ? {
            type: "account",
            account_name: pi.bank.account_name,
            account_number: pi.bank.account_number,
          }
        : {});
  return {
    name: property.name || "",
    address: property.address || "",
    ownerName: property.owner_name || "",
    totalUnits: property.unit_count || property.total_units || "",
    hasBlocks: Boolean(property.blocks?.length),
    rentDueDay: property.rent_due_day ?? 5,
    commissionRate: Number(property.commission_rate || 0),
    recurringBills: (property.recurring_bills || []).map((bill) => ({
      ...bill,
      include_with_rent: bill.include_with_rent !== false,
      payment_method: normalizePaymentMethod(bill.payment_method),
    })),
    blocks: (property.blocks || []).map((block) => ({
      id: block.id,
      name: block.name,
      total_units: block.total_units || block.unit_count || "",
    })),
    paymentInfo: {
      primary: normalizePaymentMethod(primaryPayment),
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
    const submittedBlocks = values.hasBlocks ? values.blocks || [] : [];
    const computedUnitCount = submittedBlocks.length
      ? submittedBlocks.reduce((sum, b) => sum + Number(b.total_units || 0), 0)
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
          include_with_rent: b.include_with_rent !== false,
          payment_method: compactPaymentMethod(b.payment_method),
        })),
      unit_count: computedUnitCount,
      rent_due_day: Number(values.rentDueDay) || 5,
      commission_rate: Number(values.commissionRate) || 0,
      user_id: user?.id || null,
      payment_info: {
        ...(compactPaymentMethod(values.paymentInfo.primary)
          ? { primary: compactPaymentMethod(values.paymentInfo.primary) }
          : {}),
        ...(values.paymentInfo.primary.type === "account"
          ? {
              bank: {
                account_name: values.paymentInfo.primary.account_name || null,
                account_number: values.paymentInfo.primary.account_number || null,
              },
            }
          : {}),
        ...(values.paymentInfo.primary.type === "mpesa_paybill"
          ? {
              mpesa: {
                paybill: values.paymentInfo.primary.paybill || null,
                account_number: values.paymentInfo.primary.account_number || null,
              },
            }
          : {}),
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
          submittedBlocks.map((block) => block.id).filter(Boolean),
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

        for (const b of submittedBlocks) {
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
        for (const b of submittedBlocks) {
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
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
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
        <NumberField
          name="commissionRate"
          label="Commission rate (%)"
          min={0}
          max={100}
          step={0.01}
          precision={2}
          helper="Percentage deducted from monthly collections"
        />
      </FieldSection>

      <UnitsSection />

      <FieldSection
        title="Property Payment Method"
        description="Default payment destination for rent and property-level charges"
        columns={1}
      >
        <PaymentDetailsSection />
      </FieldSection>

      <RecurringBillsSection />

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {property ? "Update Property" : "Save Property"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function UnitsSection() {
  const hasBlocks = useWatch({ name: "hasBlocks" });
  const { setValue } = useFormContext();

  return (
    <FieldSection title="Units" columns={1}>
      <div className="space-y-4">
        <div className="border border-stone-200 bg-stone-50 p-4">
          <SwitchField
            name="hasBlocks"
            label="Organise units into blocks"
            description="Turn this on if units are grouped into blocks for cleaner reporting"
          />
        </div>

        {hasBlocks ? (
          <BlocksSection />
        ) : (
          <NumberField
            name="totalUnits"
            label="Total units"
            min={0}
            helper="Total number of units in this property"
          />
        )}

        {hasBlocks && (
          <button
            type="button"
            onClick={() => {
              setValue("hasBlocks", false, { shouldDirty: true });
              setValue("blocks", [], { shouldDirty: true, shouldValidate: true });
            }}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55 hover:text-red-600"
          >
            Remove block setup
          </button>
        )}
      </div>
    </FieldSection>
  );
}

function RecurringBillsSection() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "recurringBills",
  });

  return (
    <FieldSection
      title="Utilities"
      description="Add property utilities and the payment destination tenants should use for each one"
      columns={1}
    >
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
          append({
            bill: "",
            billing_type: "flat_rate",
            amount: "",
            rate_per_unit: "",
            include_with_rent: true,
            payment_method: emptyPaymentMethod(),
          })
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
    <li className="space-y-3 border border-stone-200 bg-stone-50 p-3">
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
      <div className="border-t border-stone-200 pt-3">
        <SwitchField
          name={`recurringBills.${index}.include_with_rent`}
          label="Paid with rent"
          description="Include this utility on monthly rent invoices. Turn off for separate utility payments."
        />
      </div>
      <div className="border-t border-stone-200 pt-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
          Utility Payment Method
        </p>
        <PaymentMethodFields
          baseName={`recurringBills.${index}.payment_method`}
          compact
        />
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
  return (
    <div className="border border-stone-200 bg-stone-50 p-4">
      <PaymentMethodFields baseName="paymentInfo.primary" />
    </div>
  );
}

function BlocksSection() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "blocks" });

  return (
    <div className="space-y-3">
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
    </div>
  );
}
