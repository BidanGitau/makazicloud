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
      properties: 1,
      units: 10,
      teamMembers: 1,
    },
    routes: ["*"],
    features: [
      "1 property",
      "10 units",
      "1 team member",
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
      "5 properties",
      "100 units",
      "5 team members",
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
      "Unlimited properties",
      "Unlimited units",
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
