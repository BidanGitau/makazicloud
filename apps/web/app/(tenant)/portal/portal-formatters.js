export const money = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

export const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
