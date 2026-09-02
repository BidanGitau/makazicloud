/** YYYY-MM from a date string or Date (UTC month). */
export function monthKeyFromDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM from an arrear month value. */
export function monthKeyFromArrearMonth(month) {
  if (!month) return null;
  const fromDate = monthKeyFromDate(month);
  if (fromDate) return fromDate;
  const text = String(month).slice(0, 7);
  return /^\d{4}-\d{2}$/.test(text) ? text : null;
}

/** True when the billing month is strictly after the lease end month. */
export function isArrearMonthAfterLeaseEnd(arrearMonth, leaseEndDate) {
  const leaseKey = monthKeyFromDate(leaseEndDate);
  const arrearKey = monthKeyFromArrearMonth(arrearMonth);
  if (!leaseKey || !arrearKey) return false;
  return arrearKey > leaseKey;
}

/**
 * Arrears waived when a lease is cancelled: future months, or the lease-end
 * month when the tenant left before that month's rent due date.
 */
export function isArrearWaivedOnLeaseCancel(arrear, leaseEndDate) {
  if (!arrear?.month) return false;
  if (isArrearMonthAfterLeaseEnd(arrear.month, leaseEndDate)) return true;

  const leaseKey = monthKeyFromDate(leaseEndDate);
  const arrearKey = monthKeyFromArrearMonth(arrear.month);
  if (!leaseKey || !arrearKey || arrearKey !== leaseKey) return false;

  const due = arrear.due_date ?? arrear.dueDate ?? arrear.month;
  if (!due) return false;

  const dueDate = new Date(due);
  const leaseEnd = new Date(leaseEndDate);
  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(leaseEnd.getTime())) {
    return false;
  }

  dueDate.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);
  return leaseEnd < dueDate;
}

export function isOpenArrearStatus(status) {
  return ["pending", "partial"].includes(String(status || "").toLowerCase());
}

export function arrearBalance(amountDue, amountPaid) {
  return Math.max(0, Number(amountDue || 0) - Number(amountPaid || 0));
}

/** Open balance whose due date (or month) is on or before today — same rule as the Arrears page. */
export function isOverdueArrear(row, today = new Date()) {
  if (!isOpenArrearStatus(row?.status)) return false;

  const balance = arrearBalance(row?.amount_due ?? row?.amountDue, row?.amount_paid ?? row?.amountPaid);
  if (balance <= 0) return false;

  const due = row?.due_date ?? row?.dueDate ?? row?.month;
  if (!due) return false;

  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return false;

  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate <= normalizedToday;
}

/** Open balance whose due date (or month) is still in the future. */
export function isOutstandingArrear(row, today = new Date()) {
  if (!isOpenArrearStatus(row?.status)) return false;

  const balance = arrearBalance(row?.amount_due ?? row?.amountDue, row?.amount_paid ?? row?.amountPaid);
  if (balance <= 0) return false;

  const due = row?.due_date ?? row?.dueDate ?? row?.month;
  if (!due) return false;

  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return false;

  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate > normalizedToday;
}
