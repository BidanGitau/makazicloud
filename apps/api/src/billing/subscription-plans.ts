export type SubscriptionPlanId = "free" | "growth" | "scale";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  trialDays: number;
  currency: "KES";
  priceMonthly: number;
  priceYearly: number;
  limits: {
    properties: number | null;
    units: number | null;
    teamMembers: number | null;
  };
  routes: string[];
  features: string[];
};

export const DEFAULT_SUBSCRIPTION_PLAN_ID: SubscriptionPlanId = "free";
export const DEFAULT_TRIAL_DAYS = 30;
export const PROGRESSIVE_UNIT_PRICING_VERSION = "2026-brochure-v1";
export const MINIMUM_MONTHLY_FEE = 2500;

export type UnitPricingTier = {
  from: number;
  to: number | null;
  rate: number;
  label: string;
};

export type UnitPricingLine = {
  label: string;
  from: number;
  to: number | null;
  units: number;
  rate: number;
  amount: number;
};

export type ProgressiveUnitPricing = {
  version: string;
  currency: "KES";
  unitCount: number;
  minimumMonthlyFee: number;
  subtotal: number;
  monthlyTotal: number;
  lines: UnitPricingLine[];
  tiers: UnitPricingTier[];
};

export const UNIT_PRICING_TIERS: UnitPricingTier[] = [
  { from: 1, to: 20, rate: 100, label: "1 - 20 units" },
  { from: 21, to: 50, rate: 95, label: "21 - 50 units" },
  { from: 51, to: 100, rate: 90, label: "51 - 100 units" },
  { from: 101, to: 200, rate: 80, label: "101 - 200 units" },
  { from: 201, to: 300, rate: 70, label: "201 - 300 units" },
  { from: 301, to: 500, rate: 60, label: "301 - 500 units" },
];

export const OPTIONAL_INTEGRATION_FEES = [
  {
    id: "mpesa",
    name: "M-Pesa Integration",
    amount: 15000,
    billingType: "one_time",
    features: ["STK Push", "C2B", "B2C Payouts", "Instant Rent Collection"],
  },
  {
    id: "sms",
    name: "SMS Integration",
    amount: 10000,
    billingType: "one_time",
    features: ["Rent Reminders", "Payment Alerts", "Lease Notifications"],
  },
  {
    id: "custom",
    name: "Custom Features",
    amount: 15000,
    billingType: "from",
    features: ["Custom Workflows", "API Access", "Advanced Analytics"],
  },
];

export function calculateProgressiveUnitPricing(unitCountInput: number) {
  const unitCount = Math.max(0, Math.floor(Number(unitCountInput) || 0));
  const lines: UnitPricingLine[] = [];

  for (const tier of UNIT_PRICING_TIERS) {
    if (unitCount < tier.from) continue;
    const upper = tier.to ?? unitCount;
    const units = Math.max(0, Math.min(unitCount, upper) - tier.from + 1);
    if (!units) continue;
    const rawAmount = units * tier.rate;
    lines.push({
      label: tier.label,
      from: tier.from,
      to: tier.to,
      units,
      rate: tier.rate,
      amount: tier.from === 1 ? Math.max(MINIMUM_MONTHLY_FEE, rawAmount) : rawAmount,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const monthlyTotal = unitCount > 0 ? subtotal : 0;

  return {
    version: PROGRESSIVE_UNIT_PRICING_VERSION,
    currency: "KES" as const,
    unitCount,
    minimumMonthlyFee: MINIMUM_MONTHLY_FEE,
    subtotal,
    monthlyTotal,
    lines,
    tiers: UNIT_PRICING_TIERS,
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Start with full module access while you set up your workspace.",
    trialDays: DEFAULT_TRIAL_DAYS,
    currency: "KES",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      properties: null,
      units: null,
      teamMembers: null,
    },
    routes: ["*"],
    features: [
      "Unlimited property listings",
      "Progressive per-unit pricing after trial",
      "Team roles and owner controls",
      "Full module access during the free trial",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For landlords and managers growing beyond one property.",
    trialDays: DEFAULT_TRIAL_DAYS,
    currency: "KES",
    priceMonthly: 2999,
    priceYearly: 29990,
    limits: {
      properties: null,
      units: null,
      teamMembers: null,
    },
    routes: ["*"],
    features: [
      "Unlimited property listings",
      "Progressive per-unit pricing",
      "Team roles and owner controls",
      "Payments, arrears, maintenance, and reports",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For larger portfolios that need the full operating suite.",
    trialDays: DEFAULT_TRIAL_DAYS,
    currency: "KES",
    priceMonthly: 9999,
    priceYearly: 99990,
    limits: {
      properties: null,
      units: null,
      teamMembers: null,
    },
    routes: ["*"],
    features: [
      "Unlimited property listings",
      "Custom pricing for 500+ units",
      "Unlimited team members",
      "Full reporting, utilities, roles, and support",
    ],
  },
];

export function getSubscriptionPlan(planId?: string | null) {
  return (
    SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ||
    SUBSCRIPTION_PLANS.find((plan) => plan.id === DEFAULT_SUBSCRIPTION_PLAN_ID)!
  );
}

export function addTrialDays(start = new Date(), days = DEFAULT_TRIAL_DAYS) {
  const trialEndsAt = new Date(start);
  trialEndsAt.setDate(trialEndsAt.getDate() + days);
  return trialEndsAt;
}
