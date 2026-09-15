/** YYYY-MM for a month relative to today (local calendar). Default 0 = current month. */
export function monthKey(offset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** First and last calendar day of a YYYY-MM month. */
export function monthDateRange(month = monthKey()) {
  const value = /^\d{4}-\d{2}$/.test(month || "") ? month : monthKey();
  const [year, monthIndex] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  return {
    month: value,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
