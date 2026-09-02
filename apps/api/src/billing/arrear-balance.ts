export function arrearBalance(amountDue: unknown, amountPaid: unknown) {
  return Math.max(0, Number(amountDue || 0) - Number(amountPaid || 0));
}

export function isOpenArrearStatus(status: unknown) {
  return ["pending", "partial"].includes(String(status || "").toLowerCase());
}

/** Matches the Arrears page: open balance whose due date (or month) is on or before today. */
export function isOverdueArrear(
  row: {
    status?: unknown;
    amountDue?: unknown;
    amountPaid?: unknown;
    dueDate?: Date | string | null;
    month?: Date | string | null;
  },
  today = new Date(),
) {
  if (!isOpenArrearStatus(row.status)) return false;
  if (arrearBalance(row.amountDue, row.amountPaid) <= 0) return false;

  const due = row.dueDate || row.month;
  if (!due) return false;

  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return false;

  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate <= normalizedToday;
}

/** Open balance whose due date (or month) is still in the future. */
export function isOutstandingArrear(
  row: {
    status?: unknown;
    amountDue?: unknown;
    amountPaid?: unknown;
    dueDate?: Date | string | null;
    month?: Date | string | null;
  },
  today = new Date(),
) {
  if (!isOpenArrearStatus(row.status)) return false;
  if (arrearBalance(row.amountDue, row.amountPaid) <= 0) return false;

  const due = row.dueDate || row.month;
  if (!due) return false;

  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return false;

  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate > normalizedToday;
}
