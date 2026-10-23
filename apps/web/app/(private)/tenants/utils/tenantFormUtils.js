import { PRORATE_CUTOFF_DAY, emptyTenantForm } from "./tenantFormConfig";

/** Day-based rent for the move-in month; mirrors the API's firstMonthRent. */
export function suggestedMoveInRent(leaseStart, rentAmount) {
  const rent = Number(rentAmount || 0);
  const match = String(leaseStart || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || rent <= 0) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (day <= 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysStayed = daysInMonth - day + 1;
  if (day >= PRORATE_CUTOFF_DAY) return { amount: 0, daysStayed, daysInMonth, free: true };
  return {
    amount: Math.round((rent * daysStayed) / daysInMonth),
    daysStayed,
    daysInMonth,
    free: false,
  };
}

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
    prorate_first_month: Boolean(tenant.prorate_first_month),
    move_in_rent: tenant.move_in_rent ?? "",
  };
}

export function buildTenantPayload(values, { isEditMode = false } = {}) {
  const {
    rent_amount,
    deposit_amount,
    opening_balance,
    property_id,
    block_id,
    prorate_first_month,
    move_in_rent,
    ...rest
  } = values;

  // Move-in proration is fixed when the tenant is added.
  const prorate = !isEditMode && !values.billing_cycle_enabled && Boolean(prorate_first_month);
  const proration = isEditMode
    ? {}
    : {
        prorate_first_month: prorate,
        move_in_rent:
          prorate && move_in_rent !== "" && move_in_rent !== null && move_in_rent !== undefined
            ? Number(move_in_rent)
            : null,
      };

  return {
    payload: {
      ...rest,
      ...proration,
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
