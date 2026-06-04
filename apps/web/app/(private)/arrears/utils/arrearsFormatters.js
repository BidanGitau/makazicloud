export function formatMonth(value) {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "-";
}

export function formatKes(value) {
  return Number(value || 0).toLocaleString("en-KE");
}
