import { emptyTenantForm } from "./tenantFormConfig";

export function getTenantUnitId(tenant) {
  const unit = tenant?.unit_id;
  return unit && typeof unit === "object" ? unit.id : unit;
}

export function mapTenantToFormValues(tenant, unit, unitId) {
  const selectedUnit = unit || {};
  return {
    ...emptyTenantForm,
    full_name: tenant.full_name ?? "",
    email: tenant.email ?? "",
    national_id: tenant.national_id ?? "",
    emergency_contact: tenant.emergency_contact ?? "",
    occupation: tenant.occupation ?? "",
    notes: tenant.notes ?? "",
    lease_start: tenant.lease_start?.split("T")[0] ?? "",
    property_id: selectedUnit.property_id || "",
    block_id: selectedUnit.block_id || "",
    unit_id: unitId,
    rent_amount: selectedUnit.rent_amount ?? "",
    deposit_amount: selectedUnit.deposit_amount ?? "",
    opening_balance: tenant.opening_balance ?? "",
    billing_cycle_enabled: Boolean(tenant.billing_cycle_enabled),
    billing_cycle_months: String(tenant.billing_cycle_months ?? 1),
  };
}

export function buildTenantPayload(values) {
  const {
    rent_amount,
    deposit_amount,
    opening_balance,
    property_id,
    block_id,
    ...rest
  } = values;

  return {
    payload: {
      ...rest,
      unit_id: values.unit_id || null,
      opening_balance: opening_balance === "" ? 0 : Number(opening_balance) || 0,
      billing_cycle_enabled: Boolean(values.billing_cycle_enabled),
      billing_cycle_months: Number(values.billing_cycle_months) || 1,
    },
    rentAmount: rent_amount,
  };
}

export function buildWelcomeEmailPayload(values, property, unit) {
  return {
    tenantName: values.full_name,
    tenantEmail: values.email,
    nationalId: values.national_id || "",
    emergencyContact: values.emergency_contact || "",
    occupation: values.occupation || "",
    propertyName: property?.name || "",
    unitNumber: unit?.unit_number || "",
    leaseStart: values.lease_start || "",
    rentAmount: values.rent_amount || "",
    depositAmount: values.deposit_amount || "",
    notes: values.notes || "",
  };
}
