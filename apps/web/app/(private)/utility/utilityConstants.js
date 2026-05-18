export const SERVICE_TYPES = [
  { id: "electricity", name: "Electricity" },
  { id: "water", name: "Water" },
  { id: "gas", name: "Gas" },
  { id: "internet", name: "Internet" },
  { id: "garbage", name: "Garbage" },
  { id: "security", name: "Security" },
  { id: "other", name: "Other" },
];

// Quick label lookup: SERVICE_LABEL["electricity"] → "Electricity"
export const SERVICE_LABEL = Object.fromEntries(SERVICE_TYPES.map((t) => [t.id, t.name]));

// Shared consumption helper — used in form calculations and submit logic
export const calcConsumption = (prev, curr) =>
  Math.max(0, Number(curr || 0) - Number(prev || 0));

// Human-readable location string for a utility bill row
// unit_number is now inline from v_utility_bills_with_details
export const billLocationLabel = (bill) => {
  if (bill.assign_all) return "All units";
  if (bill.unit_number) return `Unit ${bill.unit_number}`;
  if (bill.block_id) return "Block-wide";
  return "Property-wide";
};
