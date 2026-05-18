"use client";

import { useState } from "react";
import {
  CreditCard,
  Check,
  Star,
  Zap,
  Building,
  Users,
  BarChart3,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Crown,
  X,
} from "lucide-react";

import { useAuth } from "@/app/_context/AuthContext";
import {
  getSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from "@/app/_lib/subscriptionPlans";

const planIcons = {
  free: Building,
  growth: Zap,
  scale: Crown,
};

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const currentSubscription = user?.subscription;
  const currentPlan = currentSubscription?.planId || "free";
  const currentPlanDetails = getSubscriptionPlan(currentPlan);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleUpgrade = (planId) => {
    setMessage({
      type: "info",
      text: `Upgrade to ${planId} plan coming soon. Contact support for enterprise pricing.`,
    });
  };

  const messageTone =
    message.type === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : message.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="space-y-7">
      <header>
        <p className="section-label">— Billing —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Subscription
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Manage your subscription plan and billing.
        </p>
      </header>

      {message.text && (
        <div className={`flex items-start gap-3 border p-4 sm:items-center ${messageTone}`}>
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
          )}
          <span className="text-sm font-medium">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage({ type: "", text: "" })}
            className="ml-auto p-1 text-current/70 transition-colors hover:bg-white/60 hover:text-current"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
          <span className="h-1 w-6 bg-blue-700" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Current Plan
          </p>
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center bg-blue-700 text-white">
              <CreditCard className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3
                className="text-2xl font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentPlanDetails?.name || currentPlan}
              </h3>
              <p className="mt-1 text-sm text-black/55">
                {currentSubscription?.status === "trialing" &&
                currentSubscription?.trialEndsAt
                  ? `Trial ends ${new Date(currentSubscription.trialEndsAt).toLocaleDateString()}`
                  : currentPlan === "free"
                    ? "You are on the free plan."
                    : `Next billing date: ${new Date().toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {currentPlan !== "free" && (
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                  Monthly cost
                </p>
                <p
                  className="mt-1 text-xl font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  KES{" "}
                  {SUBSCRIPTION_PLANS
                    .find((p) => p.id === currentPlan)
                    ?.priceMonthly.toLocaleString() || 0}
                </p>
              </div>
              <button
                type="button"
                className="border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-colors hover:bg-blue-50"
              >
                Manage Billing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-4">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
            billingCycle === "monthly" ? "text-black" : "text-black/40"
          }`}
        >
          Monthly
        </span>
        <button
          type="button"
          onClick={() =>
            setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
          }
          role="switch"
          aria-checked={billingCycle === "yearly"}
          className={`relative inline-flex h-6 w-12 transition-colors duration-200 focus:outline-none ${
            billingCycle === "yearly" ? "bg-blue-700" : "bg-stone-300"
          }`}
        >
          <span
            className={`mt-0.5 inline-block h-5 w-5 transform bg-white transition-transform duration-200 ${
              billingCycle === "yearly" ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
        <span
          className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${
            billingCycle === "yearly" ? "text-black" : "text-black/40"
          }`}
        >
          Yearly
          <span className="border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-green-700">
            Save 17%
          </span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const Icon = planIcons[plan.id] || Building;
          const isCurrentPlan = currentPlan === plan.id;
          const price =
            billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col border bg-white ${
                plan.popular ? "border-blue-700" : "border-stone-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-blue-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    <Star className="h-3 w-3" strokeWidth={2} />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="border-b border-stone-200 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center bg-blue-700 text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <p className="section-label mt-4">— {plan.name} —</p>
                <h3
                  className="mt-2 text-2xl font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-black/55">{plan.description}</p>

                <div className="mt-4">
                  <span
                    className="text-3xl font-black uppercase tracking-tight text-black sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {price === 0 ? "Free" : `KES ${price.toLocaleString()}`}
                  </span>
                  {price > 0 && (
                    <span className="ml-1 text-sm text-black/55">
                      /{billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-3 p-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-blue-700 text-white">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center border border-stone-300 bg-white">
                        <span className="h-0.5 w-2 bg-black/40" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-black/80" : "text-black/40"
                      }`}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="p-6 pt-0">
                <button
                  type="button"
                  onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                  disabled={isCurrentPlan}
                  className={`inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                    isCurrentPlan
                      ? "cursor-not-allowed border border-stone-300 bg-stone-50 text-black/40"
                      : "bg-blue-700 text-white hover:bg-blue-800"
                  }`}
                >
                  {isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    <>
                      {currentPlan === "free" ? "Get Started" : "Upgrade"}
                      <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Why Upgrade */}
      <div className="border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
          <span className="h-1 w-6 bg-blue-700" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Why Upgrade
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-blue-700 text-white">
              <Users className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="font-bold text-black">Team Collaboration</h4>
              <p className="mt-1 text-sm text-black/55">
                Add team members and assign roles with specific permissions.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-blue-700 text-white">
              <BarChart3 className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="font-bold text-black">Advanced Analytics</h4>
              <p className="mt-1 text-sm text-black/55">
                Get deeper insights into your property performance.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-blue-700 text-white">
              <Shield className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="font-bold text-black">Priority Support</h4>
              <p className="mt-1 text-sm text-black/55">
                Get faster responses and dedicated support channels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Sales */}
      <div className="border border-stone-200 bg-stone-50 p-6 text-center">
        <p className="section-label">— Enterprise —</p>
        <h3
          className="mt-2 text-xl font-black uppercase tracking-tight text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Need a custom plan?
        </h3>
        <p className="mt-2 text-sm text-black/55">
          Contact our sales team for enterprise pricing and custom solutions.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center gap-2 bg-blue-700 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
        >
          Contact Sales
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
