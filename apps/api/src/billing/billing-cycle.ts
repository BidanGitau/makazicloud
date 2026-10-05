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
  return cycleAmount + unitDepositAmount(tenantRow);
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
