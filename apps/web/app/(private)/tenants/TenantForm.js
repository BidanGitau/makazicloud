"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { z } from "zod";
import { User, Upload, Mail, FileText, X } from "lucide-react";
import { Tenants, Payments, Units } from "@/app/_lib/repositories";
import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";
import { invalidateFormDataCache, useFormData } from "@/app/_hooks/useFormData";
import { useAuth } from "@/app/_context/AuthContext";
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
} from "@/app/_components/forms";

const BILLING_CYCLES = [
  { value: "2", label: "Bi-monthly" },
  { value: "3", label: "Quarterly" },
  { value: "6", label: "Bi-annual" },
  { value: "12", label: "Annual" },
];

const VACANT_STATUSES = ["vacant", "available", "Vacant", "Available"];

const getTenantUnitId = (t) => {
  const u = t?.unit_id;
  return u && typeof u === "object" ? u.id : u;
};

const tenantSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  national_id: z.string().min(1, "National ID is required"),
  emergency_contact: z.string().min(1, "Phone number is required"),
  occupation: z.string().optional(),
  notes: z.string().optional(),
  lease_start: z.string().min(1, "Lease start date is required"),
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().min(1, "Choose a unit"),
  rent_amount: z.union([z.coerce.number(), z.literal("")]).optional(),
  deposit_amount: z.union([z.coerce.number(), z.literal("")]).optional(),
  initial_payment: z.union([z.coerce.number(), z.literal("")]).optional(),
  billing_cycle_enabled: z.boolean().default(false),
  billing_cycle_months: z.string().optional(),
});

const emptyForm = {
  full_name: "",
  email: "",
  national_id: "",
  emergency_contact: "",
  occupation: "",
  notes: "",
  lease_start: "",
  property_id: "",
  block_id: "",
  unit_id: "",
  rent_amount: "",
  deposit_amount: "",
  initial_payment: "",
  billing_cycle_enabled: false,
  billing_cycle_months: "1",
};

export default function TenantForm({ tenant = null, onSuccess }) {
  const { user } = useAuth();


  const { properties, blocks } = useFormData();
  const [contractFile, setContractFile] = useState(null);
  const [initial, setInitial] = useState(null);


  const [unitsCache, setUnitsCache] = useState({});
  const cacheUnits = useCallback(
    (rows) =>
      setUnitsCache((prev) => {
        const next = { ...prev };
        (rows || []).forEach((u) => {
          if (u?.id) next[u.id] = u;
        });
        return next;
      }),
    [],
  );

  const isEditMode = Boolean(tenant?.id);


  useEffect(() => {
    if (!tenant) {
      setInitial(null);
      return;
    }
    let cancelled = false;
    const baseUnitId = getTenantUnitId(tenant) || "";

    const hydrate = (unit) => {
      const u = unit || {};
      setInitial({
        ...emptyForm,
        full_name: tenant.full_name ?? "",
        email: tenant.email ?? "",
        national_id: tenant.national_id ?? "",
        emergency_contact: tenant.emergency_contact ?? "",
        occupation: tenant.occupation ?? "",
        notes: tenant.notes ?? "",
        lease_start: tenant.lease_start?.split("T")[0] ?? "",
        property_id: u.property_id || "",
        block_id: u.block_id || "",
        unit_id: baseUnitId,
        rent_amount: u.rent_amount ?? "",
        deposit_amount: u.deposit_amount ?? "",
        billing_cycle_enabled: Boolean(tenant.billing_cycle_enabled),
        billing_cycle_months: String(tenant.billing_cycle_months ?? 1),
      });
    };


    if (tenant.unit_id && typeof tenant.unit_id === "object") {
      cacheUnits([tenant.unit_id]);
      hydrate(tenant.unit_id);
      return;
    }
    if (!baseUnitId) {
      hydrate(null);
      return;
    }
    Units.getById(baseUnitId)
      .then((unit) => {
        if (cancelled) return;
        if (unit) cacheUnits([unit]);
        hydrate(unit);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("TenantForm: failed to load current unit", err);
          hydrate(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, cacheUnits]);

  const sendWelcomeEmail = async (values) => {
    if (!values.email) return;
    try {
      const propObj = properties.find((p) => p.id === values.property_id);
      const unitObj = unitsCache[values.unit_id];
      const response = await fetch(`${API_BASE_URL}/email/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getTenantHeaders() },
        credentials: "include",
        body: JSON.stringify({
          tenantName: values.full_name,
          tenantEmail: values.email,
          nationalId: values.national_id || "",
          emergencyContact: values.emergency_contact || "",
          occupation: values.occupation || "",
          propertyName: propObj?.name || "",
          unitNumber: unitObj?.unit_number || "",
          leaseStart: values.lease_start || "",
          rentAmount: values.rent_amount || "",
          depositAmount: values.deposit_amount || "",
          notes: values.notes || "",
        }),
      });
      const result = await response.json().catch(() => ({ success: false }));
      if (!result.success) console.error("Email failed:", result.error);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  const handleSubmit = async (values) => {
    const {
      rent_amount,
      deposit_amount,
      initial_payment,
      property_id,
      block_id,
      ...rest
    } = values;
    const payload = {
      ...rest,
      unit_id: values.unit_id || null,
      billing_cycle_enabled: Boolean(values.billing_cycle_enabled),
      billing_cycle_months: Number(values.billing_cycle_months) || 1,
    };

    try {
      if (isEditMode) {
        await Tenants.update(tenant.id, payload);
      } else {
        const newTenant = await Tenants.create({
          ...payload,
          user_id: user?.id ?? null,
          status: "active",
        });
        const initialAmt = Number(initial_payment || rent_amount || 0);
        if (initialAmt > 0 && newTenant?.id) {
          await Payments.create({
            tenant_id: newTenant.id,
            amount: initialAmt,
            payment_date:
              values.lease_start || new Date().toISOString().split("T")[0],
            method: "cash",
          });
        }
        if (values.email) await sendWelcomeEmail(values);
      }
      invalidateFormDataCache();
      onSuccess?.();
    } catch (err) {
      console.error("Failed to save tenant:", err);
      showToast.error(err?.message || "Failed to save tenant");
      throw err;
    }
  };

  return (
    <AppForm
      schema={tenantSchema}
      defaultValues={emptyForm}
      values={initial}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Tenant —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isEditMode ? "Update tenant" : "Create tenant"}
        </h2>
      </header>

      <FieldSection title="Personal Information" columns={2}>
        <TextField name="full_name" label="Full Name" icon={User} required />
        <TextField
          name="email"
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="tenant@example.com"
        />
        <TextField name="national_id" label="National ID" required />
        <TextField
          name="emergency_contact"
          label="Phone Number"
          type="tel"
          placeholder="e.g. 0712345678"
          required
        />
        <TextField name="occupation" label="Occupation" className="md:col-span-2" />
        <TextAreaField name="notes" label="Notes" rows={3} className="md:col-span-2" />
      </FieldSection>

      <PropertyAssignmentSection
        properties={properties}
        blocks={blocks}
        unitsCache={unitsCache}
        cacheUnits={cacheUnits}
        currentUnitId={isEditMode ? initial?.unit_id || null : null}
        isEditMode={isEditMode}
      />

      <FieldSection title="Lease & Finance" columns={2}>
        <DateField name="lease_start" label="Lease Start" required disabled={isEditMode} />
        <NumberField
          name="deposit_amount"
          label="Deposit (KSh)"
          min={0}
          disabled
        />
        <NumberField
          name="rent_amount"
          label="Rent (KSh)"
          min={0}
          disabled
          className="md:col-span-2"
        />
        {!isEditMode && (
          <NumberField
            name="initial_payment"
            label="First Payment (KSh)"
            min={0}
            placeholder="Defaults to selected unit rent"
            className="md:col-span-2"
          />
        )}
        <BillingCycleFields />
      </FieldSection>

      {!isEditMode && (
        <ContractUpload
          contractFile={contractFile}
          setContractFile={setContractFile}
        />
      )}

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          {isEditMode ? "Update Tenant" : "Add Tenant"}
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function PropertyAssignmentSection({
  properties,
  blocks,
  unitsCache,
  cacheUnits,
  currentUnitId,
  isEditMode,
}) {
  const { setValue } = useFormContext();
  const propertyId = useWatch({ name: "property_id" });
  const blockId = useWatch({ name: "block_id" });
  const unitId = useWatch({ name: "unit_id" });
  const initialPayment = useWatch({ name: "initial_payment" });
  const [vacantUnits, setVacantUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const propertyBlocks = useMemo(
    () => blocks.filter((b) => b.property_id === propertyId),
    [blocks, propertyId],
  );


  useEffect(() => {
    if (!propertyId) {
      setVacantUnits([]);
      return;
    }
    if (propertyBlocks.length > 0 && !blockId) {
      setVacantUnits([]);
      return;
    }
    setUnitsLoading(true);
    const controller = new AbortController();
    Units.getAll({
      match: {
        property_id: propertyId,
        ...(blockId ? { block_id: blockId } : {}),
      },
      filter: [{ column: "status", operator: "in", value: VACANT_STATUSES }],
      order: { column: "unit_number", ascending: true },
      signal: controller.signal,
    })
      .then((rows) => {
        const list = rows || [];
        cacheUnits(list);
        setVacantUnits(list);
        setUnitsLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("TenantForm: failed to load units", err);
          setVacantUnits([]);
          setUnitsLoading(false);
        }
      });
    return () => controller.abort();
  }, [propertyId, blockId, propertyBlocks.length, cacheUnits]);


  const availableUnits = useMemo(() => {
    const map = new Map(vacantUnits.map((u) => [u.id, u]));
    if (currentUnitId && unitsCache[currentUnitId] && !map.has(currentUnitId)) {
      map.set(currentUnitId, unitsCache[currentUnitId]);
    }
    return Array.from(map.values());
  }, [vacantUnits, currentUnitId, unitsCache]);


  useEffect(() => {
    const unit = unitsCache[unitId];
    if (unit) {
      setValue("rent_amount", unit.rent_amount || "", { shouldDirty: false });
      setValue("deposit_amount", unit.deposit_amount || unit.rent_amount || "", {
        shouldDirty: false,
      });
      if (
        !isEditMode &&
        (initialPayment === "" ||
          initialPayment === null ||
          initialPayment === undefined ||
          Number(initialPayment) === 0)
      ) {
        setValue("initial_payment", unit.rent_amount || "", { shouldDirty: false });
      }
    }
  }, [initialPayment, isEditMode, unitId, unitsCache, setValue]);

  return (
    <FieldSection title="Property Assignment" columns={2}>
      <SelectField
        name="property_id"
        label="Property"
        placeholder="Select property"
        showSearch
        required
        disabled={isEditMode}
        options={properties.map((p) => ({ value: p.id, label: p.name }))}
        className="md:col-span-2"
        onValueChange={() => {
          setValue("block_id", "");
          setValue("unit_id", "");
        }}
      />
      {propertyBlocks.length > 0 && (
        <SelectField
          name="block_id"
          label="Block"
          placeholder="Select block"
          disabled={isEditMode}
          options={propertyBlocks.map((b) => ({ value: b.id, label: b.name }))}
          onValueChange={() => setValue("unit_id", "")}
        />
      )}
      <SelectField
        name="unit_id"
        label="Unit"
        placeholder={
          !propertyId
            ? "Select property first"
            : propertyBlocks.length > 0 && !blockId
              ? "Select block first"
            : unitsLoading
              ? "Loading units…"
              : availableUnits.length === 0
                ? "No vacant units"
                : "Select unit"
        }
        required
        disabled={
          isEditMode ||
          !propertyId ||
          unitsLoading ||
          (propertyBlocks.length > 0 && !blockId)
        }
        loading={unitsLoading}
        options={availableUnits.map((u) => ({
          value: u.id,
          label: u.unit_number || u.name,
        }))}
        className={propertyBlocks.length > 0 ? "" : "md:col-span-2"}
      />
    </FieldSection>
  );
}

function BillingCycleFields() {
  const enabled = useWatch({ name: "billing_cycle_enabled" });
  return (
    <>
      <SwitchField
        name="billing_cycle_enabled"
        label="Custom billing cycle"
        description="Bill less frequently than monthly"
        className="md:col-span-2"
      />
      {enabled && (
        <SelectField
          name="billing_cycle_months"
          label="Billing cycle"
          options={BILLING_CYCLES}
          required
          allowClear={false}
        />
      )}
    </>
  );
}

function ContractUpload({ contractFile, setContractFile }) {
  const email = useWatch({ name: "email" });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast.error("File size must be less than 10MB");
      return;
    }
    setContractFile(file);
  };

  return (
    <FieldSection title="Contract Document" columns={1}>
      {!contractFile ? (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-stone-300 transition-colors hover:border-blue-700 hover:bg-blue-50/50">
          <Upload className="mb-2 h-8 w-8 text-black/40" strokeWidth={1.8} />
          <span className="text-sm text-black/70">Click to upload contract</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
            PDF, DOC, DOCX (max 10MB)
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between border border-blue-700 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-700" strokeWidth={1.8} />
            <div>
              <p className="text-sm font-bold text-black">{contractFile.name}</p>
              <p className="text-[11px] text-black/55">
                {(contractFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setContractFile(null)}
            className="p-1 text-black/55 hover:text-red-600"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      )}
      {email && contractFile && (
        <p className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
          <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
          Will be sent to {email}
        </p>
      )}
    </FieldSection>
  );
}
