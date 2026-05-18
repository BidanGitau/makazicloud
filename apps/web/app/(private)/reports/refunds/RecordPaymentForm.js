"use client";

import { z } from "zod";
import { DollarSign, CheckCircle } from "lucide-react";
import { Refunds } from "@/app/_lib/repositories";
import { showToast } from "@/app/_components/CustomToast";
import { formatCurrency } from "@/app/_lib/formatters";
import {
  AppForm,
  FieldSection,
  TextAreaField,
  NumberField,
  SelectField,
  DateField,
  SubmitButton,
  useWatch,
} from "@/app/_components/forms";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "cancelled", label: "Cancelled" },
];

const refundSchema = z.object({
  lease_end_date: z.string().optional(),
  amount_refunded: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  status: z.string().min(1, "Choose a status"),
  notes: z.string().optional(),
});

export default function RecordPaymentForm({ row, onSuccess }) {
  const defaultValues = {
    lease_end_date: row.lease_end_date || "",
    amount_refunded: row.amount_refunded || "",
    status: row.status || "pending",
    notes: row.notes || "",
  };

  const handleSubmit = async (values) => {
    try {
      await Refunds.recordPayment(row.tenant_id, row.unit_id, {
        lease_end_date: values.lease_end_date || null,
        amount_refunded: values.amount_refunded ? Number(values.amount_refunded) : 0,
        status: values.status,
        notes: values.notes || null,
      });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      showToast.error("Failed to save.");
      throw err;
    }
  };

  return (
    <AppForm
      schema={refundSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Refund —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Record payment
        </h2>
        <p className="mt-1 text-sm text-black/55">
          {row.property_name} · Unit {row.unit_number}
        </p>
      </header>

      <DepositSummary row={row} />

      <FieldSection title="Payment Details" columns={2}>
        <DateField name="lease_end_date" label="Lease End Date" />
        <NumberField
          name="amount_refunded"
          label="Amount Refunded (KSh)"
          min={0}
          placeholder="0.00"
        />
        <SelectField
          name="status"
          label="Status"
          options={STATUS_OPTIONS}
          allowClear={false}
          className="md:col-span-2"
        />
        <TextAreaField
          name="notes"
          label="Notes"
          rows={3}
          placeholder="e.g. Paid via M-Pesa ref #…"
          className="md:col-span-2"
        />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Save Payment Record
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function DepositSummary({ row }) {
  const amount = useWatch({ name: "amount_refunded" });
  const outstanding =
    row.total_deposit - row.deductions - Number(amount || 0);

  return (
    <div className="border border-stone-200 bg-stone-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
        <p className="section-label">— Deposit Summary —</p>
      </div>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <Row label="Total Deposit Paid" value={formatCurrency(row.total_deposit)} />
        <Row
          label="Deductions (tenant fault)"
          value={`− ${formatCurrency(row.deductions)}`}
          accent="text-black/65"
        />
        <div className="my-1 border-t border-stone-200" />
        <Row
          label="Refundable Amount"
          value={formatCurrency(Math.max(0, outstanding))}
          accent={outstanding > 0 ? "text-blue-700" : "text-black/40"}
          bold
        />
      </dl>
    </div>
  );
}

function Row({ label, value, accent = "", bold }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={`text-black/55 ${bold ? "font-bold uppercase tracking-[0.16em] text-[11px]" : ""}`}>
        {label}
      </dt>
      <dd
        className={`font-mono tabular-nums ${bold ? "text-base font-black" : "text-sm font-bold"} ${accent || "text-black"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </dd>
    </div>
  );
}
