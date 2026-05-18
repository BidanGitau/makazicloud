export const formatCurrency = (amount, options = {}) => {
  const { locale = "en-KE", currency = "KES" } = options;
  const value = Number(amount || 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};
