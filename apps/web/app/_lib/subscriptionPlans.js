export const DEFAULT_SUBSCRIPTION_PLAN_ID = "free";
export const PROGRESSIVE_UNIT_PRICING_VERSION = "2026-brochure-v1";
export const MINIMUM_MONTHLY_FEE = 2500;

export const UNIT_PRICING_TIERS = [
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

export function calculateProgressiveUnitPricing(unitCountInput) {
  const unitCount = Math.max(0, Math.floor(Number(unitCountInput) || 0));
  const lines = [];

  UNIT_PRICING_TIERS.forEach((tier) => {
    if (unitCount < tier.from) return;
    const upper = tier.to ?? unitCount;
    const units = Math.max(0, Math.min(unitCount, upper) - tier.from + 1);
    if (!units) return;
    const rawAmount = units * tier.rate;
    lines.push({
      label: tier.label,
      from: tier.from,
      to: tier.to,
      units,
      rate: tier.rate,
      amount: tier.from === 1 ? Math.max(MINIMUM_MONTHLY_FEE, rawAmount) : rawAmount,
    });
  });

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const monthlyTotal = unitCount > 0 ? subtotal : 0;

  return {
    version: PROGRESSIVE_UNIT_PRICING_VERSION,
    currency: "KES",
    unitCount,
    minimumMonthlyFee: MINIMUM_MONTHLY_FEE,
    subtotal,
    monthlyTotal,
    lines,
    tiers: UNIT_PRICING_TIERS,
  };
}

export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Start with full module access while you set up your workspace.",
    trialDays: 30,
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
      { name: "Unlimited property listings", included: true },
      { name: "Progressive per-unit pricing after trial", included: true },
      { name: "Team roles and owner controls", included: true },
      { name: "Full module access during the free trial", included: true },
      { name: "Payments and arrears", included: true },
      { name: "Utilities and maintenance", included: true },
      { name: "Reports and settings", included: true },
    ],
    color: "gray",
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For landlords and managers growing beyond one property.",
    trialDays: 30,
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
      { name: "Unlimited property listings", included: true },
      { name: "Progressive per-unit pricing", included: true },
      { name: "Team roles and owner controls", included: true },
      { name: "Payments, arrears, maintenance, and reports", included: true },
      { name: "Utilities", included: false },
      { name: "Custom roles", included: false },
      { name: "Priority support", included: false },
    ],
    color: "blue",
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For larger portfolios that need the full operating suite.",
    trialDays: 30,
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
      { name: "Unlimited property listings", included: true },
      { name: "Custom pricing for 500+ units", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Full reporting, utilities, roles, and support", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced reports", included: true },
      { name: "Custom roles", included: true },
    ],
    color: "black",
    popular: false,
  },
];

export function getSubscriptionPlan(planId) {
  return (
    SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ||
    SUBSCRIPTION_PLANS.find((plan) => plan.id === DEFAULT_SUBSCRIPTION_PLAN_ID)
  );
}

export function formatLimit(value, label) {
  return value === null ? `Unlimited ${label}` : `${value} ${label}`;
}
