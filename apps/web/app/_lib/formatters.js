export const formatCurrency = (amount, options = {}) => {
  const { locale = "en-KE", currency = "KES" } = options;
  const value = Number(amount || 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** e.g. "05 Oct 2026" */
export const formatShortDate = (value, fallback = "-") => {
  const date = toValidDate(value);
  return date
    ? date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
    : fallback;
};

/** e.g. "October 2026" */
export const formatMonthYear = (value, fallback = "-") => {
  const date = toValidDate(value);
  return date
    ? date.toLocaleDateString("en-KE", { month: "long", year: "numeric" })
    : fallback;
};
