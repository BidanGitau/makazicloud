"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Payments, Tenants } from "@/app/_lib/repositories";
import { useAuth } from "@/app/_context/AuthContext";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  NumberField,
  SelectField,
  DateField,
  SubmitButton,
  AsyncSelectField,
  useWatch,
} from "@/app/_components/forms";

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
];

const paymentSchema = z.object({
  tenant_id: z.string().min(1, "Choose a tenant"),
  amount: z.coerce.number().min(1, "Enter an amount"),
  payment_date: z.string().min(1, "Payment date is required"),
  method: z.string().min(1, "Choose a method"),
  reference: z.string().optional(),
});

// Format a v_tenant_overview row as an AsyncSelectField option, with the unit
// + cycle data attached as `raw` so dependent UI (ExpectedHint) can read it
// without a second round-trip.
const toTenantOption = (row) => ({
  value: row.tenant_id || row.id,
  label: row.property_name
    ? `${row.full_name} — ${row.property_name}${row.unit_number ? ` · #${row.unit_number}` : ""}`
    : row.full_name,
  raw: row,
});

export default function PaymentForm({ onSuccess, initialTenantId }) {
  const { user } = useAuth();
  const [prefill, setPrefill] = useState(null);
  // Map of tenant_id -> overview row for tenants the user has touched. Lets
  // ExpectedHint read rent / cycle without re-fetching.
  const [tenantCache, setTenantCache] = useState({});

  // Pre-fill: fetch the single tenant by id (NOT the whole tenants list).
  useEffect(() => {
    if (!initialTenantId) {
      setPrefill(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await Tenants.getDetails(initialTenantId);
        if (cancelled || !row) return;
        const tenantId = row.tenant_id || row.id;
        setTenantCache((prev) => ({ ...prev, [tenantId]: row }));
        setPrefill({
          tenant_id: tenantId,
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          method: "cash",
          reference: "",
        });
      } catch (err) {
        console.warn("PaymentForm: failed to prefill tenant", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTenantId]);

  const initialOption = useMemo(() => {
    if (!initialTenantId) return null;
    const row = tenantCache[initialTenantId];
    return row ? toTenantOption(row) : null;
  }, [initialTenantId, tenantCache]);

  const loadTenantOptions = async (query, { signal }) => {
    const rows = await Tenants.search(query, { signal });
    return rows.map(toTenantOption);
  };

  const handleSubmit = async (values) => {
    try {
      await Payments.create({
        tenant_id: values.tenant_id,
        amount: Number(values.amount),
        payment_date: values.payment_date,
        method: values.method,
        reference: values.reference,
        user_id: user?.id ?? null,
      });
      showToast.success("Payment recorded");
      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to record payment");
      throw err;
    }
  };

  // Hold rendering until prefill resolves so the AsyncSelect can mount with
  // the seeded option, not without it (which would leave the dropdown blank).
  if (initialTenantId && !prefill) {
    return (
      <div className="space-y-3 p-6">
        <div className="h-4 w-1/3 animate-pulse bg-stone-200" />
        <div className="h-10 w-full animate-pulse bg-stone-200" />
        <div className="h-10 w-full animate-pulse bg-stone-200" />
      </div>
    );
  }

  return (
    <AppForm
      schema={paymentSchema}
      defaultValues={{
        tenant_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        method: "cash",
        reference: "",
      }}
      values={prefill}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Record Payment —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New payment
        </h2>
      </header>

      <FieldSection title="Tenant" columns={1}>
        <AsyncSelectField
          name="tenant_id"
          label="Tenant"
          placeholder="Search by name…"
          required
          loadOptions={loadTenantOptions}
          initialOption={initialOption}
          onValueChange={(_value, option) => {
            if (option?.raw)
              setTenantCache((prev) => ({
                ...prev,
                [option.value]: option.raw,
              }));
          }}
        />
        <ExpectedHint tenantCache={tenantCache} />
      </FieldSection>

      <FieldSection title="Payment Details" columns={2}>
        <NumberField
          name="amount"
          label="Amount (KSh)"
          min={0}
          required
          placeholder="0"
        />
        <DateField name="payment_date" label="Payment date" required />
        <SelectField
          name="method"
          label="Method"
          options={METHOD_OPTIONS}
          required
          allowClear={false}
        />
        <TextField
          name="reference"
          label="Reference (optional)"
          placeholder="e.g. MPESA code / bank ref"
        />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Record Payment
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function ExpectedHint({ tenantCache }) {
  const tenantId = useWatch({ name: "tenant_id" });
  const tenant = tenantId ? tenantCache[tenantId] : null;
  if (!tenant) return null;
  const cycleMonths = Number(tenant.billing_cycle_months ?? 1) || 1;
  const rentAmount = Number(tenant.rent_amount ?? 0);
  const expected = rentAmount * cycleMonths;
  if (!expected) return null;
  return (
    <div className="border-l-2 border-blue-700 bg-blue-50 px-3 py-2 text-[12px] text-black/75">
      Expected payment:{" "}
      <span
        className="font-mono font-bold tabular-nums text-blue-700"
        style={{ fontFamily: "var(--font-display)" }}
      >
        KSh {expected.toLocaleString()}
      </span>
      {cycleMonths > 1 && (
        <span className="ml-2 text-black/45">
          · {cycleMonths}-month cycle
        </span>
      )}
    </div>
  );
}
