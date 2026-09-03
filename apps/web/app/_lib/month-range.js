/** YYYY-MM for a month relative to today (UTC). Default -1 = last completed month. */
export function monthKey(offset = 0) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

/** First and last calendar day of a YYYY-MM month. */
export function monthDateRange(month = monthKey(-1)) {
  const value = /^\d{4}-\d{2}$/.test(month || "") ? month : monthKey(-1);
  const [year, monthIndex] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  return {
    month: value,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
