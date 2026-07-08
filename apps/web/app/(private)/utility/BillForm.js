"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { UtilityBills, UtilityMeterReadings } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import { SERVICE_TYPES, calcConsumption } from "./utilityConstants";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  SelectField,
  SwitchField,
  SubmitButton,
  useFormContext,
  useWatch,
} from "@/app/_components/forms";

const serviceNameById = Object.fromEntries(SERVICE_TYPES.map((type) => [type.id, type.name]));

function normalizeRecurringService(service) {
  if (!service) return "";
  return service === "service_charge" ? "other" : service;
}

function recurringBillLabel(bill) {
  const serviceId = normalizeRecurringService(bill?.bill);
  return serviceNameById[serviceId] || String(bill?.bill || "Utility Bill").replace(/_/g, " ");
}

function recurringBillKey(bill, index) {
  return [
    index,
    bill?.bill || "bill",
    bill?.billing_type || "flat_rate",
    bill?.amount ?? "",
    bill?.rate_per_unit ?? "",
  ].join(":");
}

function selectedKeysAreMeteredOnly(keys = []) {
  return keys.length > 0 && keys.every((key) => key.split(":")[2] === "metered");
}

function isRecurringBillReady(bill) {
  return (bill?.billing_type || "flat_rate") === "metered"
    ? Number(bill?.rate_per_unit || 0) > 0
    : Number(bill?.amount || 0) > 0;
}

const billSchema = z
  .object({
    property_id: z.string().min(1, "Choose a property"),
    block_id: z.string().optional().or(z.literal("")),
    unit_id: z.string().optional().or(z.literal("")),
    service_type: z.string().optional(),
    billing_type: z.enum(["flat_rate", "metered"]).default("flat_rate"),
    billing_month: z.string().min(1, "Billing month is required"),
    payment_mode: z.string().optional(),
    use_property_recurring: z.boolean().default(false),
    recurring_auto_assign: z.boolean().default(true),
    selected_recurring_bills: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.use_property_recurring) {
      if (!data.selected_recurring_bills.length) {
        ctx.addIssue({
          path: ["selected_recurring_bills"],
          code: z.ZodIssueCode.custom,
          message: "Select at least one bill",
        });
      }
      if (
        !data.recurring_auto_assign &&
        !selectedKeysAreMeteredOnly(data.selected_recurring_bills) &&
        !data.unit_id
      ) {
        ctx.addIssue({
          path: ["unit_id"],
          code: z.ZodIssueCode.custom,
          message: "Select a unit for flat-rate bills or turn on auto-assign",
        });
      }
      return;
    }
  });

const emptyForm = {
  property_id: "",
  block_id: "",
  unit_id: "",
  service_type: "",
  billing_type: "flat_rate",
  billing_month: "",
  payment_mode: "",
  use_property_recurring: false,
  recurring_auto_assign: true,
  selected_recurring_bills: [],
};

export default function BillForm({ properties, initialValues = {}, onSuccess }) {
  const [meterReadings, setMeterReadings] = useState({});

  const handleSubmit = async (values) => {
    try {
      const billingMonth = values.billing_month + "-01";
      const property = properties.find((p) => p.id === values.property_id);
      const propertyRecurringBills = property?.recurring_bills || [];
      const billName =
        SERVICE_TYPES.find((t) => t.id === values.service_type)?.name ??
        "Utility Bill";

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
        payment_mode: values.payment_mode?.trim() || null,
        reference: null,
      };

      if (values.use_property_recurring) {
        const selectedKeys = new Set(values.selected_recurring_bills || []);
        const selectedRecurringBills = propertyRecurringBills.filter(
          (bill, index) =>
            isRecurringBillReady(bill) &&
            selectedKeys.has(recurringBillKey(bill, index)),
        );
        if (!selectedRecurringBills.length) {
          throw new Error("Select at least one recurring bill to add");
        }

        for (const recurringBill of selectedRecurringBills) {
          const serviceType = normalizeRecurringService(recurringBill.bill);
          const isMetered = (recurringBill.billing_type || "flat_rate") === "metered";
          const billKey = recurringBillKey(
            recurringBill,
            propertyRecurringBills.indexOf(recurringBill),
          );

          if (isMetered) {
            const rate = Number(recurringBill.rate_per_unit || 0);
            const readings = meterReadings[billKey] || {};
            const rows = Object.entries(readings).filter(([, reading]) =>
              reading?.current_reading !== undefined &&
              reading?.current_reading !== "" &&
              Number(reading.current_reading) >= Number(reading.previous_reading || 0),
            );

            if (!rows.length) {
              throw new Error(`Add readings for ${recurringBillLabel(recurringBill)}`);
            }

            for (const [unitId, reading] of rows) {
              const previousReading = Number(reading.previous_reading || 0);
              const currentReading = Number(reading.current_reading || 0);
              const consumption = calcConsumption(previousReading, currentReading);
              const amount = consumption * rate;
              const bill = await UtilityBills.create({
                ...base,
                unit_id: unitId,
                name: recurringBillLabel(recurringBill),
                service_type: serviceType || null,
                billing_type: "metered",
                rate_per_unit: rate,
                previous_reading: previousReading,
                current_reading: currentReading,
                units_consumed: consumption,
                total_amount: amount,
                assign_all: false,
              });

              if (bill?.id) {
                await UtilityMeterReadings.create({
                  property_id: values.property_id,
                  unit_id: unitId,
                  service_type: serviceType || null,
                  billing_month: billingMonth,
                  previous_reading: previousReading,
                  current_reading: currentReading,
                  consumption,
                  rate_per_unit: rate,
                  amount,
                  bill_id: bill.id,
                });
              }
            }
            continue;
          }

          await UtilityBills.create({
            ...base,
            unit_id: values.recurring_auto_assign ? null : values.unit_id || null,
            name: recurringBillLabel(recurringBill),
            service_type: serviceType || null,
            billing_type: "flat_rate",
            rate_per_unit: null,
            previous_reading: null,
            current_reading: null,
            units_consumed: null,
            total_amount: Number(recurringBill.amount || 0),
            assign_all: values.recurring_auto_assign,
            ...(values.recurring_auto_assign ? { split_amount: false } : {}),
          });
        }
      } else {
        throw new Error("Set recurring bills on the property before adding utility bills");
      }

      onSuccess?.();
    } catch (err) {
      showToast.error(err?.message || "Failed to save bill");
      throw err;
    }
  };

  return (
    <AppForm
      schema={billSchema}
      defaultValues={{ ...emptyForm, ...initialValues }}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Utility Bill —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
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
        <RecurringBillQuickFill properties={properties} setMeterReadings={setMeterReadings} />
      </FieldSection>

      <BillBodyByType
        properties={properties}
        meterReadings={meterReadings}
        setMeterReadings={setMeterReadings}
      />

      <FieldSection title="Billing Period" columns={2}>
        <TextField
          name="billing_month"
          label="Billing month"
          type="month"
          required
        />
        <TextField
          name="payment_mode"
          label="Payment mode / Paybill"
          placeholder="Same as rent, or e.g. Water Paybill 123456"
        />
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
  const firstPropertyRef = useRef(propertyId);
  const { propertyBlocks, hasBlocks } = usePropertyStructure(
    propertyId,
    blockId,
  );

  useEffect(() => {
    if (firstPropertyRef.current === propertyId) return;
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

function RecurringBillQuickFill({ properties, setMeterReadings }) {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const usePropertyRecurring = useWatch({ name: "use_property_recurring" });
  const recurringAutoAssign = useWatch({ name: "recurring_auto_assign" });
  const property = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );
  const recurringBills = property?.recurring_bills || [];
  const selectedRecurringBills = useWatch({ name: "selected_recurring_bills" }) || [];
  const readyRecurringBills = recurringBills.filter(isRecurringBillReady);
  const selectedSet = useMemo(
    () => new Set(selectedRecurringBills),
    [selectedRecurringBills],
  );
  const flatBillKeys = useMemo(
    () =>
      recurringBills
        .map((bill, index) => ({ bill, key: recurringBillKey(bill, index) }))
        .filter(({ bill }) => isRecurringBillReady(bill))
        .map(({ key }) => key),
    [recurringBills],
  );

  useEffect(() => {
    if (!propertyId) return;
    setValue("use_property_recurring", readyRecurringBills.length > 0, {
      shouldDirty: true,
    });
    setValue("selected_recurring_bills", flatBillKeys, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setMeterReadings({});
  }, [flatBillKeys, propertyId, readyRecurringBills.length, setMeterReadings, setValue]);

  useEffect(() => {
    if (!usePropertyRecurring) return;
    setValue("billing_type", "flat_rate", { shouldDirty: true });
    if (recurringAutoAssign) setValue("unit_id", "");
  }, [recurringAutoAssign, setValue, usePropertyRecurring]);

  if (!propertyId) {
    return (
      <div className="md:col-span-2 border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-black/55">
        Select a property to use the recurring bills saved on it.
      </div>
    );
  }

  if (recurringBills.length === 0) {
    return (
      <div className="md:col-span-2 border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-black/55">
        This property has no recurring bills saved yet.
      </div>
    );
  }

  return (
    <div className="md:col-span-2 space-y-3 border border-stone-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Recurring bills
          </p>
          <p className="mt-1 text-sm text-black/60">
            Use the bills already saved on {property?.name || "this property"}.
          </p>
        </div>
        <span className="self-start bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
          {selectedRecurringBills.length}/{readyRecurringBills.length} selected
        </span>
      </div>

      <div className="border-y border-stone-200 py-3">
        <SwitchField
          name="recurring_auto_assign"
          label="Auto-assign to tenants"
          description="Create a bill for each active tenant unit in the selected property or block."
        />
      </div>

      {usePropertyRecurring && recurringAutoAssign && (
        <p className="border-l-2 border-blue-700 bg-blue-50 px-3 py-2 text-xs text-black/65">
          All flat-rate recurring bills below will be generated for every active tenant unit.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {recurringBills.map((rb, i) => {
          const key = recurringBillKey(rb, i);
          const isSelectable = isRecurringBillReady(rb);
          const isSelected = selectedSet.has(key);

          return (
          <button
            key={i}
            type="button"
            disabled={!isSelectable}
            onClick={() => {
              if (!isSelectable) return;
              const next = isSelected
                ? selectedRecurringBills.filter((billKey) => billKey !== key)
                : [...selectedRecurringBills, key];
              setValue("selected_recurring_bills", next, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            className={`flex items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${
              isSelected
                ? "border-blue-200 bg-blue-50"
                : "border-stone-200 bg-stone-50"
            } ${isSelectable ? "hover:border-blue-300" : "cursor-not-allowed opacity-60"}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold capitalize text-black">
                {recurringBillLabel(rb)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-black/50">
                {rb.billing_type === "metered"
                  ? rb.rate_per_unit
                    ? `KSh ${Number(rb.rate_per_unit).toLocaleString()}/unit`
                    : "Metered"
                  : rb.amount
                    ? `KSh ${Number(rb.amount).toLocaleString()}`
                    : "Flat rate"}
              </p>
            </div>
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              {!isSelectable ? "Set rate" : isSelected ? "Selected" : "Select"}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function BillBodyByType({ properties, meterReadings, setMeterReadings }) {
  const usePropertyRecurring = useWatch({ name: "use_property_recurring" });

  if (usePropertyRecurring) {
    return (
      <>
        <RecurringBillAssignment />
        <MeteredRecurringReadings
          properties={properties}
          meterReadings={meterReadings}
          setMeterReadings={setMeterReadings}
        />
      </>
    );
  }

  return null;
}

function RecurringBillAssignment() {
  const autoAssign = useWatch({ name: "recurring_auto_assign" });
  const selectedRecurringBills = useWatch({ name: "selected_recurring_bills" }) || [];
  const meteredOnly = selectedKeysAreMeteredOnly(selectedRecurringBills);
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const { propertyUnits } = usePropertyStructure(propertyId, blockId);

  return (
    <FieldSection title="Tenants" columns={2}>
      {autoAssign ? (
        <div className="md:col-span-2 border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-black/60">
          Bills will be created for each active tenant unit in the selected property or block.
        </div>
      ) : meteredOnly ? (
        <div className="md:col-span-2 border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-black/60">
          Metered bills use the units entered in the readings table below.
        </div>
      ) : (
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
      )}
    </FieldSection>
  );
}

function MeteredRecurringReadings({ properties, meterReadings, setMeterReadings }) {
  const [previousLocks, setPreviousLocks] = useState({});
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const selectedRecurringBills = useWatch({ name: "selected_recurring_bills" }) || [];
  const property = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );
  const recurringBills = property?.recurring_bills || [];
  const { propertyUnits } = usePropertyStructure(propertyId, blockId);
  const unitIds = useMemo(
    () => propertyUnits.map((unit) => unit.id),
    [propertyUnits],
  );
  const unitIdsKey = unitIds.join("|");
  const selectedSet = useMemo(
    () => new Set(selectedRecurringBills),
    [selectedRecurringBills],
  );
  const selectedMeteredBills = useMemo(
    () =>
      recurringBills
        .map((bill, index) => ({ bill, key: recurringBillKey(bill, index) }))
        .filter(
          ({ bill, key }) =>
            (bill.billing_type || "flat_rate") === "metered" &&
            Number(bill.rate_per_unit || 0) > 0 &&
            selectedSet.has(key),
        ),
    [recurringBills, selectedSet],
  );

  const setReading = (billKey, unitId, field, value) => {
    setMeterReadings((current) => ({
      ...current,
      [billKey]: {
        ...(current[billKey] || {}),
        [unitId]: {
          ...(current[billKey]?.[unitId] || {}),
          [field]: value,
        },
      },
    }));
  };

  useEffect(() => {
    if (!unitIds.length || !selectedMeteredBills.length) {
      setPreviousLocks({});
      return;
    }

    let cancelled = false;

    async function loadLastReadings() {
      const locks = {};
      const loadedReadings = {};

      for (const { bill, key } of selectedMeteredBills) {
        const serviceType = normalizeRecurringService(bill.bill);
        const latest = await UtilityMeterReadings.getLastReadings(unitIds, serviceType);
        locks[key] = {};
        loadedReadings[key] = {};

        for (const unitId of unitIds) {
          if (latest[unitId] === undefined || latest[unitId] === null) continue;
          locks[key][unitId] = true;
          loadedReadings[key][unitId] = String(latest[unitId]);
        }
      }

      if (cancelled) return;

      setPreviousLocks(locks);
      setMeterReadings((current) => {
        const next = { ...current };
        for (const [billKey, readingsByUnit] of Object.entries(loadedReadings)) {
          next[billKey] = { ...(next[billKey] || {}) };
          for (const [unitId, previousReading] of Object.entries(readingsByUnit)) {
            const currentUnitReading = next[billKey][unitId] || {};
            next[billKey][unitId] = {
              ...currentUnitReading,
              previous_reading:
                currentUnitReading.previous_reading === undefined ||
                currentUnitReading.previous_reading === ""
                  ? previousReading
                  : currentUnitReading.previous_reading,
            };
          }
        }
        return next;
      });
    }

    loadLastReadings().catch((error) => {
      console.warn("Failed to load last meter readings", error);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedMeteredBills, setMeterReadings, unitIds, unitIdsKey]);

  if (!selectedMeteredBills.length) return null;

  return (
    <FieldSection title="Meter Readings" columns={1}>
      {selectedMeteredBills.map(({ bill, key }) => {
        const rate = Number(bill.rate_per_unit || 0);
        const readings = meterReadings[key] || {};
        const total = Object.values(readings).reduce((sum, reading) => {
          const consumption = calcConsumption(
            reading?.previous_reading,
            reading?.current_reading,
          );
          return sum + consumption * rate;
        }, 0);

        return (
          <div key={key} className="space-y-3 border border-stone-200 bg-white p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-black">{recurringBillLabel(bill)}</p>
                <p className="text-xs text-black/50">
                  KSh {rate.toLocaleString()} per unit
                </p>
                <p className="mt-1 text-xs text-black/45">
                  If a previous reading exists, it is filled automatically. First entries need both readings.
                </p>
              </div>
              <p
                className="text-sm font-black tabular-nums text-blue-700"
                style={{ fontFamily: "var(--font-display)" }}
              >
                KSh {total.toLocaleString()}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2 pr-3">Previous</th>
                    <th className="py-2 pr-3">Current</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyUnits.map((unit) => {
                    const reading = readings[unit.id] || {};
                    const previousLocked = previousLocks[key]?.[unit.id] === true;
                    const consumption = calcConsumption(
                      reading.previous_reading,
                      reading.current_reading,
                    );
                    const amount = consumption * rate;

                    return (
                      <tr key={unit.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-2 pr-3 font-semibold text-black">
                          Unit {unit.unit_number}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            min="0"
                            value={reading.previous_reading || ""}
                            disabled={previousLocked}
                            placeholder={previousLocked ? "Auto" : "Previous"}
                            onChange={(event) =>
                              setReading(key, unit.id, "previous_reading", event.target.value)
                            }
                            className="w-28 border border-stone-300 bg-white px-2 py-1 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-100 disabled:text-black/55"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            min="0"
                            value={reading.current_reading || ""}
                            placeholder="Current"
                            onChange={(event) =>
                              setReading(key, unit.id, "current_reading", event.target.value)
                            }
                            className="w-28 border border-stone-300 bg-white px-2 py-1 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums text-black/70">
                          {amount > 0 ? `KSh ${amount.toLocaleString()}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </FieldSection>
  );
}
