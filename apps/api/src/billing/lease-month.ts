export function monthKeyFromDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyFromArrearMonth(month: Date | string | null | undefined) {
  if (!month) return null;
  if (month instanceof Date) return monthKeyFromDate(month);
  const fromDate = monthKeyFromDate(month);
  if (fromDate) return fromDate;
  const text = String(month).slice(0, 7);
  return /^\d{4}-\d{2}$/.test(text) ? text : null;
}

export function isArrearMonthAfterLeaseEnd(
  arrearMonth: Date | string,
  leaseEndDate: Date | string,
) {
  const leaseKey = monthKeyFromDate(leaseEndDate);
  const arrearKey = monthKeyFromArrearMonth(arrearMonth);
  if (!leaseKey || !arrearKey) return false;
  return arrearKey > leaseKey;
}

export function isArrearWaivedOnLeaseCancel(
  arrear: {
    month?: Date | string | null;
    dueDate?: Date | string | null;
  },
  leaseEndDate: Date | string,
) {
  const arrearMonth = arrear.month;
  if (!arrearMonth) return false;
  if (isArrearMonthAfterLeaseEnd(arrearMonth, leaseEndDate)) return true;

  const leaseKey = monthKeyFromDate(leaseEndDate);
  const arrearKey = monthKeyFromArrearMonth(arrearMonth);
  if (!leaseKey || !arrearKey || arrearKey !== leaseKey) return false;

  const due = arrear.dueDate ?? arrearMonth;
  const dueDate = due instanceof Date ? due : new Date(due);
  const leaseEnd =
    leaseEndDate instanceof Date ? leaseEndDate : new Date(leaseEndDate);
  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(leaseEnd.getTime())) {
    return false;
  }

  dueDate.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);
  return leaseEnd < dueDate;
}

export function leaseEndMonthStart(leaseEndDate: Date | string) {
  const date = leaseEndDate instanceof Date ? leaseEndDate : new Date(leaseEndDate);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
