export function billingCycleMonths(tenantRow: any) {
  if (!tenantRow?.billingCycleEnabled) return 1;
  return Math.max(1, Number(tenantRow.billingCycleMonths) || 1);
}

export function monthsBetween(startMonth: Date, month: Date) {
  return (
    (month.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 +
    (month.getUTCMonth() - startMonth.getUTCMonth())
  );
}

export function isBillingMonth(
  startMonth: Date,
  month: Date,
  cycleMonths: number,
) {
  if (cycleMonths <= 1) return true;
  const elapsedMonths = monthsBetween(startMonth, month);
  return elapsedMonths > 0 && elapsedMonths % cycleMonths === 0;
}

export function isFirstBillingMonth(
  startMonth: Date,
  month: Date,
  cycleMonths: number,
) {
  if (cycleMonths <= 1) return monthsBetween(startMonth, month) === 0;
  return monthsBetween(startMonth, month) === cycleMonths;
}

export function rentCycleAmount(tenantRow: any) {
  const rentAmount = Number(tenantRow?.unit?.rentAmount || 0) || 0;
  return rentAmount * billingCycleMonths(tenantRow);
}

export function unitDepositAmount(tenantRow: any) {
  return Number(tenantRow?.unit?.depositAmount || 0) || 0;
}

/** Move-ins on or after this day pay nothing for the rest of that month. */
export const PRORATE_CUTOFF_DAY = 25;

/** Monthly tenants who moved in after the 1st with first-month proration on. */
export function isProratedMoveIn(tenantRow: any) {
  if (!tenantRow?.prorateFirstMonth || !tenantRow?.leaseStart) return false;
  if (billingCycleMonths(tenantRow) !== 1) return false;
  return new Date(tenantRow.leaseStart).getUTCDate() > 1;
}

/** Rent charged in the first billing month (excludes the deposit). */
export function firstMonthRent(tenantRow: any) {
  const rent = rentCycleAmount(tenantRow);
  if (!isProratedMoveIn(tenantRow)) return rent;

  // An amount negotiated with the tenant overrides the day-based proration.
  const agreed = tenantRow.moveInRent;
  if (agreed !== null && agreed !== undefined && agreed !== "") {
    return Math.max(0, Number(agreed) || 0);
  }

  const start = new Date(tenantRow.leaseStart);
  const day = start.getUTCDate();
  if (day >= PRORATE_CUTOFF_DAY) return 0;

  const daysInMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return Math.round((rent * (daysInMonth - day + 1)) / daysInMonth);
}

/**
 * Prorated tenants pay the part month and the following month on the
 * move-in date; normal due days apply from the month after that.
 */
export function moveInDueDate(tenantRow: any, month: Date) {
  if (!isProratedMoveIn(tenantRow)) return null;
  const start = new Date(tenantRow.leaseStart);
  const startMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const elapsed = monthsBetween(startMonth, month);
  if (elapsed !== 0 && elapsed !== 1) return null;
  return new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
}

export function billedAmountDue(
  tenantRow: any,
  month: Date,
  startMonth: Date,
) {
  const cycleAmount = rentCycleAmount(tenantRow);
  if (
    !isFirstBillingMonth(startMonth, month, billingCycleMonths(tenantRow))
  ) {
    return cycleAmount;
  }
  return firstMonthRent(tenantRow) + unitDepositAmount(tenantRow);
}

export function nextBillingMonthAfter(
  startMonth: Date,
  afterMonth: Date,
  cycleMonths: number,
  addMonths: (value: Date, months: number) => Date,
) {
  let month = addMonths(afterMonth, 1);
  while (!isBillingMonth(startMonth, month, cycleMonths)) {
    month = addMonths(month, 1);
  }
  return month;
}
