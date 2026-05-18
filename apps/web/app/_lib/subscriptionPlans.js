export const DEFAULT_SUBSCRIPTION_PLAN_ID = "free";

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
      properties: 1,
      units: 10,
      teamMembers: 1,
    },
    routes: ["*"],
    features: [
      { name: "1 property", included: true },
      { name: "10 units", included: true },
      { name: "1 team member", included: true },
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
      properties: 5,
      units: 100,
      teamMembers: 5,
    },
    routes: [
      "/dashboard",
      "/propertylisting",
      "/units",
      "/tenants",
      "/payments",
      "/arrears",
      "/reports/tenant",
      "/maintenance",
      "/settings",
    ],
    features: [
      { name: "5 properties", included: true },
      { name: "100 units", included: true },
      { name: "5 team members", included: true },
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
      { name: "Unlimited properties", included: true },
      { name: "Unlimited units", included: true },
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
