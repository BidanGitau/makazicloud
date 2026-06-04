"use client";

import { useEffect, useState, useCallback } from "react";
import { Tenants, Payments, Units } from "@/app/_lib/repositories";
import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";
import { invalidateFormDataCache, useFormData } from "@/app/_hooks/useFormData";
import { useAuth } from "@/app/_context/AuthContext";
import { showToast } from "@/app/_components/CustomToast";
import { AppForm, SubmitButton } from "@/app/_components/forms";
import TenantContractUpload from "./components/TenantContractUpload";
import TenantLeaseFinanceSection from "./components/TenantLeaseFinanceSection";
import TenantPersonalInfoSection from "./components/TenantPersonalInfoSection";
import TenantPropertyAssignmentSection from "./components/TenantPropertyAssignmentSection";
import { emptyTenantForm, tenantSchema } from "./utils/tenantFormConfig";
import {
  buildTenantPayload,
  buildWelcomeEmailPayload,
  getTenantUnitId,
  mapTenantToFormValues,
  resolveInitialPaymentAmount,
} from "./utils/tenantFormUtils";

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
      setInitial(mapTenantToFormValues(tenant, unit, baseUnitId));
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
        body: JSON.stringify(buildWelcomeEmailPayload(values, propObj, unitObj)),
      });
      const result = await response.json().catch(() => ({ success: false }));
      if (!result.success) console.error("Email failed:", result.error);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  const handleSubmit = async (values) => {
    const { payload, initialPayment, rentAmount } = buildTenantPayload(values);

    try {
      if (isEditMode) {
        await Tenants.update(tenant.id, payload);
      } else {
        const newTenant = await Tenants.create({
          ...payload,
          user_id: user?.id ?? null,
          status: "active",
        });
        const initialAmt = resolveInitialPaymentAmount(
          initialPayment,
          rentAmount,
        );
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
      defaultValues={emptyTenantForm}
      values={initial}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Tenant —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isEditMode ? "Update tenant" : "Create tenant"}
        </h2>
      </header>

      <TenantPersonalInfoSection />

      <TenantPropertyAssignmentSection
        properties={properties}
        blocks={blocks}
        unitsCache={unitsCache}
        cacheUnits={cacheUnits}
        currentUnitId={isEditMode ? initial?.unit_id || null : null}
        isEditMode={isEditMode}
      />

      <TenantLeaseFinanceSection isEditMode={isEditMode} />

      {!isEditMode && (
        <TenantContractUpload
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
