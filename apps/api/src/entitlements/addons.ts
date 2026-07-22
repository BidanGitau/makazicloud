import { getSubscriptionPlan } from "../billing/subscription-plans";

export const ADDON_KEYS = [
  "dashboard",
  "properties",
  "units",
  "tenants",
  "payments",
  "arrears",
  "refunds",
  "reports",
  "owner_settlements",
  "maintenance",
  "utilities",
  "mpesa",
  "sms",
  "public_listings",
] as const;

export type AddonKey = (typeof ADDON_KEYS)[number];

const ALL_ADDONS = [...ADDON_KEYS];

const PLAN_ADDONS: Record<string, AddonKey[]> = {
  free: ALL_ADDONS,
  growth: ALL_ADDONS,
  scale: ALL_ADDONS,
};

export function getPlanAddonKeys(planId?: string | null) {
  const plan = getSubscriptionPlan(planId);
  return PLAN_ADDONS[plan.id] || [];
}

export function isAddonKey(value: string): value is AddonKey {
  return (ADDON_KEYS as readonly string[]).includes(value);
}
