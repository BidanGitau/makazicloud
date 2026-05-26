"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { UtilityBills, UtilityMeterReadings } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { SERVICE_TYPES, calcConsumption } from "./utilityConstants";
import UnitReadingsList from "./UnitReadingsList";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  NumberField,
  SelectField,
  SwitchField,
  SubmitButton,
  useFormContext,
  useWatch,
} from "@/app/_components/forms";

const serviceOptions = SERVICE_TYPES.map((t) => ({
  value: t.id,
  label: t.name,
}));

const billSchema = z
  .object({
    property_id: z.string().min(1, "Choose a property"),
    block_id: z.string().optional().or(z.literal("")),
    unit_id: z.string().optional().or(z.literal("")),
    service_type: z.string().optional(),
    billing_type: z.enum(["flat_rate", "metered"]).default("flat_rate"),
    flat_amount: z.union([z.coerce.number(), z.literal("")]).optional(),
    rate_per_unit: z.union([z.coerce.number(), z.literal("")]).optional(),
    previous_reading: z.union([z.coerce.number(), z.literal("")]).optional(),
    current_reading: z.union([z.coerce.number(), z.literal("")]).optional(),
    billing_month: z.string().min(1, "Billing month is required"),
    assign_all: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.billing_type === "flat_rate") {
      if (!data.flat_amount || Number(data.flat_amount) <= 0) {
        ctx.addIssue({
          path: ["flat_amount"],
          code: z.ZodIssueCode.custom,
          message: "Enter an amount",
        });
      }
      if (!data.assign_all && !data.unit_id) {
        ctx.addIssue({
          path: ["unit_id"],
          code: z.ZodIssueCode.custom,
          message: "Select unit or assign all",
        });
      }
    }
    if (data.billing_type === "metered" && !data.rate_per_unit) {
      ctx.addIssue({
        path: ["rate_per_unit"],
        code: z.ZodIssueCode.custom,
        message: "Rate per unit is required",
      });
    }
  });

const emptyForm = {
  property_id: "",
  block_id: "",
  unit_id: "",
  service_type: "",
  billing_type: "flat_rate",
  flat_amount: "",
  rate_per_unit: "",
  previous_reading: "",
  current_reading: "",
  billing_month: "",
  assign_all: false,
};

async function createMeteredBillWithReading(base, unitId, prev, curr, rate) {
  const consumption = calcConsumption(prev, curr);
  const bill = await UtilityBills.create({
    ...base,
    unit_id: unitId,
    previous_reading: prev,
    current_reading: curr,
    units_consumed: consumption,
    total_amount: consumption * rate,
    assign_all: false,
  });
  if (bill?.id) {
    await UtilityMeterReadings.create({
      property_id: base.property_id,
      unit_id: unitId,
      service_type: base.service_type,
      billing_month: base.billing_month,
      previous_reading: prev,
      current_reading: curr,
      consumption,
      rate_per_unit: rate,
      amount: consumption * rate,
      bill_id: bill.id,
    });
  }
}

export default function BillForm({ properties, onSuccess }) {


  const [meterReadings, setMeterReadings] = useState({});
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const handleSubmit = async (values) => {
    try {
      const billingMonth = values.billing_month + "-01";
      const rate = Number(values.rate_per_unit) || 0;
      const billName =
        SERVICE_TYPES.find((t) => t.id === values.service_type)?.name ??
        "Utility Bill";
      const hasUnitReadings = Object.keys(meterReadings).length > 0;

      const base = {
        property_id: values.property_id,
        block_id: values.block_id || null,
        name: billName,
        service_type: values.service_type || null,
        billing_type: values.billing_type,
        billing_month: billingMonth,
        due_date: null,
        status: "unpaid",
        paid_amount: 0,
        reference: null,
      };

      if (values.billing_type === "metered" && hasUnitReadings) {
        for (const unitId of Object.keys(meterReadings)) {
          const r = meterReadings[unitId];
          if (!r) continue;
          await createMeteredBillWithReading(
            { ...base, rate_per_unit: rate },
            unitId,
            Number(r.previous_reading || 0),
            Number(r.current_reading || 0),
            rate,
          );
        }
      } else if (values.billing_type === "metered") {
        const prev = Number(values.previous_reading) || 0;
        const curr = Number(values.current_reading) || 0;
        await createMeteredBillWithReading(
          { ...base, rate_per_unit: rate },
          values.unit_id || null,
          prev,
          curr,
          rate,
        );
      } else {
        const totalAmount = Number(values.flat_amount) || 0;
        await UtilityBills.create({
          ...base,
          unit_id: values.unit_id || null,
          rate_per_unit: null,
          previous_reading: null,
          current_reading: null,
          units_consumed: null,
          total_amount: totalAmount,
          assign_all: values.assign_all,
        });
      }

      setMeterReadings({});
      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to save bill");
      throw err;
    }
  };

  return (
    <AppForm
      schema={billSchema}
      defaultValues={emptyForm}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Utility Bill —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New bill
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
        <BlockSelector />
        <RecurringBillQuickFill properties={properties} />
      </FieldSection>

      <FieldSection title="Service" columns={2}>
        <SelectField
          name="service_type"
          label="Service type (optional)"
          placeholder="Select type"
          options={serviceOptions}
        />
        <BillingTypeToggle />
      </FieldSection>

      <BillBodyByType
        meterReadings={meterReadings}
        setMeterReadings={setMeterReadings}
        selectedUnitId={selectedUnitId}
        setSelectedUnitId={setSelectedUnitId}
      />

      <FieldSection title="Billing Period" columns={2}>
        <TextField
          name="billing_month"
          label="Billing month"
          type="month"
          required
        />
        <FlatRateAssignAll />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Add Bill
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function BlockSelector() {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const { propertyBlocks, hasBlocks } = usePropertyStructure(
    propertyId,
    blockId,
  );

  useEffect(() => {
    setValue("block_id", "");
  }, [propertyId, setValue]);

  if (!hasBlocks) return null;
  return (
    <SelectField
      name="block_id"
      label="Block (optional)"
      placeholder="All blocks"
      options={propertyBlocks.map((b) => ({ value: b.id, label: b.name }))}
    />
  );
}

function RecurringBillQuickFill({ properties }) {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const property = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );
  const recurringBills = property?.recurring_bills || [];

  if (recurringBills.length === 0) return null;
  return (
    <div className="md:col-span-2">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        Recurring bills
      </p>
      <div className="flex flex-wrap gap-2">
        {recurringBills.map((rb, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const serviceId =
                rb.bill === "service_charge" ? "other" : rb.bill;
              const isMetered = rb.billing_type === "metered";
              setValue("service_type", serviceId || "");
              setValue("billing_type", isMetered ? "metered" : "flat_rate");
              setValue(
                isMetered ? "rate_per_unit" : "flat_amount",
                String(rb.rate_per_unit ?? rb.amount ?? ""),
              );
            }}
            className="border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:bg-blue-100"
          >
            {rb.bill ? rb.bill.replace(/_/g, " ") : "Bill"}
            {rb.billing_type === "metered"
              ? rb.rate_per_unit
                ? ` — KSh ${Number(rb.rate_per_unit).toLocaleString()}/u`
                : " (metered)"
              : rb.amount
                ? ` — KSh ${Number(rb.amount).toLocaleString()}`
                : ""}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-black/40">Click to pre-fill</p>
    </div>
  );
}

function BillingTypeToggle() {
  const { setValue } = useFormContext();
  const current = useWatch({ name: "billing_type" }) || "flat_rate";
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        Billing type
      </p>
      <div className="flex border border-stone-300">
        {["flat_rate", "metered"].map((type, i) => (
          <button
            key={type}
            type="button"
            onClick={() => setValue("billing_type", type, { shouldDirty: true })}
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
    </div>
  );
}

function BillBodyByType({
  meterReadings,
  setMeterReadings,
  selectedUnitId,
  setSelectedUnitId,
}) {
  const billingType = useWatch({ name: "billing_type" }) || "flat_rate";
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const { propertyUnits } = usePropertyStructure(propertyId, blockId);

  if (billingType === "flat_rate") {
    return (
      <FieldSection title="Flat Rate" columns={2}>
        <NumberField
          name="flat_amount"
          label="Amount (KSh)"
          min={0}
          placeholder="0"
          required
        />
        <FlatUnitSelector propertyUnits={propertyUnits} />
      </FieldSection>
    );
  }
  return (
    <MeteredBody
      propertyUnits={propertyUnits}
      meterReadings={meterReadings}
      setMeterReadings={setMeterReadings}
      selectedUnitId={selectedUnitId}
      setSelectedUnitId={setSelectedUnitId}
    />
  );
}

function FlatUnitSelector({ propertyUnits }) {
  const assignAll = useWatch({ name: "assign_all" });
  if (propertyUnits.length === 0 || assignAll) return null;
  return (
    <SelectField
      name="unit_id"
      label="Unit"
      placeholder="Select unit"
      required
      options={propertyUnits.map((u) => ({
        value: u.id,
        label: `Unit ${u.unit_number}`,
      }))}
    />
  );
}

function FlatRateAssignAll() {
  const billingType = useWatch({ name: "billing_type" });
  if (billingType !== "flat_rate") return null;
  return (
    <SwitchField
      name="assign_all"
      label="Auto-assign to all tenants"
      description="Split this bill across every tenant in the property"
    />
  );
}

function MeteredBody({
  propertyUnits,
  meterReadings,
  setMeterReadings,
  selectedUnitId,
  setSelectedUnitId,
}) {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const serviceType = useWatch({ name: "service_type" });
  const ratePerUnit = useWatch({ name: "rate_per_unit" });
  const previousReading = useWatch({ name: "previous_reading" });
  const currentReading = useWatch({ name: "current_reading" });
  const unitId = useWatch({ name: "unit_id" });
  const [prevLocked, setPrevLocked] = useState(false);


  useEffect(() => {
    if (!propertyId || !serviceType) return;
    UtilityBills.getLastReading(propertyId, serviceType).then((last) => {
      if (last !== null) {
        setValue("previous_reading", String(last));
        setPrevLocked(true);
      }
    });
  }, [propertyId, serviceType, setValue]);

  const totalAmount = useMemo(() => {
    const rate = Number(ratePerUnit) || 0;
    if (Object.keys(meterReadings).length > 0) {
      return Object.values(meterReadings).reduce(
        (sum, r) =>
          sum + calcConsumption(r.previous_reading, r.current_reading) * rate,
        0,
      );
    }
    return calcConsumption(previousReading, currentReading) * rate;
  }, [ratePerUnit, previousReading, currentReading, meterReadings]);

  const addUnit = () => {
    if (!selectedUnitId || meterReadings[selectedUnitId]) return;
    setMeterReadings((prev) => ({
      ...prev,
      [selectedUnitId]: { previous_reading: "", current_reading: "" },
    }));
    setSelectedUnitId("");
  };
  const removeUnit = (id) =>
    setMeterReadings((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  const setCurrent = (id, value) =>
    setMeterReadings((prev) => ({
      ...prev,
      [id]: { ...prev[id], current_reading: value },
    }));

  return (
    <FieldSection title="Metered" columns={1}>
      {propertyUnits.length > 0 && Object.keys(meterReadings).length === 0 && (
        <SelectField
          name="unit_id"
          label="Unit (optional)"
          placeholder="All units / use unit readings below"
          options={propertyUnits.map((u) => ({
            value: u.id,
            label: `Unit ${u.unit_number}`,
          }))}
          helper="Leave blank to add per-unit readings"
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <NumberField
          name="rate_per_unit"
          label="Rate per unit (KSh)"
          min={0}
          placeholder="e.g. 85"
          required
        />
        <div className="relative">
          <NumberField
            name="previous_reading"
            label="Previous reading"
            min={0}
            placeholder="e.g. 3456"
            disabled={prevLocked}
          />
          {prevLocked && (
            <button
              type="button"
              onClick={() => setPrevLocked(false)}
              className="absolute right-3 top-9 text-black/40 hover:text-blue-700"
              title="Edit previous reading"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
        <NumberField
          name="current_reading"
          label="Current reading"
          min={0}
          placeholder="e.g. 3459"
        />
      </div>

      {ratePerUnit &&
        currentReading &&
        Object.keys(meterReadings).length === 0 && (
          <div className="border-l-2 border-blue-700 bg-blue-50 px-3 py-2 text-[12px] text-black/75">
            Consumption:{" "}
            <span className="font-bold text-blue-700">
              {calcConsumption(previousReading, currentReading)} units
            </span>{" "}
            → Total:{" "}
            <span
              className="font-mono font-bold tabular-nums text-blue-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              KSh {totalAmount.toLocaleString()}
            </span>
          </div>
        )}

      {propertyId && (
        <UnitReadingsList
          propertyUnits={propertyUnits}
          meterReadings={meterReadings}
          ratePerUnit={ratePerUnit}
          selectedUnitId={selectedUnitId}
          setSelectedUnitId={setSelectedUnitId}
          onAdd={addUnit}
          onRemove={removeUnit}
          onSetCurrentReading={setCurrent}
        />
      )}

      {totalAmount > 0 && Object.keys(meterReadings).length > 0 && (
        <div className="border-l-2 border-blue-700 bg-blue-50 px-3 py-2 text-[12px] text-black/75">
          Total:{" "}
          <span
            className="font-mono font-bold tabular-nums text-blue-700"
            style={{ fontFamily: "var(--font-display)" }}
          >
            KSh {totalAmount.toLocaleString()}
          </span>
        </div>
      )}
    </FieldSection>
  );
}
