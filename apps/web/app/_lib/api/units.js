import { apiFetch } from "./client";

export async function applyRentAdjustment(payload) {
  return apiFetch("/units/rent-adjustment", {
    method: "POST",
    body: payload,
  });
}

export function defaultEffectiveMonth() {
  return minEffectiveMonth();
}

/** Earliest selectable effective month (next month — current month is already in). */
export function minEffectiveMonth() {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 7);
}

export function isEffectiveMonthAllowed(value) {
  return /^\d{4}-\d{2}$/.test(String(value || "")) && value >= minEffectiveMonth();
}

export const EFFECTIVE_MONTH_ERROR =
  "Choose a future month — the current month is already in progress";
