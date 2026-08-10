"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle,
  CreditCard,
  MessageCirclePlus,
  PlugZap,
  ReceiptText,
  Settings2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/app/_context/AuthContext";
import {
  calculateProgressiveUnitPricing,
  MINIMUM_MONTHLY_FEE,
  OPTIONAL_INTEGRATION_FEES,
  UNIT_PRICING_TIERS,
} from "@/app/_lib/subscriptionPlans";

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString("en-KE")}`;

const formatTierRange = (tier) =>
  tier.to ? `${tier.from} - ${tier.to}` : `${tier.from}+`;

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const [message, setMessage] = useState({ type: "", text: "" });
  const currentSubscription = user?.subscription;
  const usage = currentSubscription?.usage || {};
  const pricing = useMemo(
    () =>
      currentSubscription?.pricing ||
      calculateProgressiveUnitPricing(Number(usage.units || 0)),
    [currentSubscription?.pricing, usage.units],
  );
  const hasUnits = pricing.unitCount > 0;

  const handleContact = (subject) => {
    setMessage({
      type: "info",
      text: `${subject} setup is handled by support so pricing, credentials, and rollout are confirmed cleanly.`,
    });
  };

  const messageTone =
    message.type === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : message.type === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="space-y-6">
      <header>
        <p className="section-label">- Billing -</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Subscription
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Progressive pricing based on the number of units you manage.
        </p>
      </header>

      {message.text && (
        <div
          className={`flex items-start gap-3 border p-4 sm:items-center ${messageTone}`}
        >
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

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          icon={Building}
          label="Properties"
          value={usage.properties ?? 0}
          detail="Listed portfolio"
        />
        <MetricTile
          icon={ReceiptText}
          label="Units"
          value={pricing.unitCount}
          detail="Current billing count"
        />
        <MetricTile
          icon={Users}
          label="Team"
          value={usage.teamMembers ?? 0}
          detail="Assigned users"
        />
        <MetricTile
          icon={CreditCard}
          label="Monthly"
          value={hasUnits ? formatKes(pricing.monthlyTotal) : "KES 0"}
          detail={hasUnits ? "Estimated subscription" : "No units yet"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-stone-200 bg-white">
          <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
            <span className="h-1 w-6 bg-blue-700" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Current Estimate
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-black/55">
                  First 20 units are protected by the minimum monthly fee, then
                  only extra units move into the next tier.
                </p>
                <p
                  className="mt-3 text-3xl font-black tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {hasUnits ? formatKes(pricing.monthlyTotal) : "KES 0"}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">
                  {hasUnits
                    ? `${pricing.unitCount} unit${pricing.unitCount === 1 ? "" : "s"} this month`
                    : `Minimum fee starts at ${formatKes(MINIMUM_MONTHLY_FEE)} once billing begins`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleContact("Billing")}
                className="inline-flex items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                Manage Billing
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-6 overflow-hidden border border-stone-200">
              <table className="min-w-full divide-y divide-stone-200 text-left">
                <thead className="bg-stone-50">
                  <tr>
                    {["Tier", "Units", "Rate", "Amount"].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {pricing.lines.length ? (
                    pricing.lines.map((line) => (
                      <tr key={line.label}>
                        <td className="px-4 py-3 text-sm font-bold text-black">
                          {line.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-black/65">
                          {line.units}
                        </td>
                        <td className="px-4 py-3 text-sm text-black/65">
                          {formatKes(line.rate)} / unit
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-black">
                          {formatKes(line.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-black/45"
                      >
                        Add units to see the billing breakdown.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-stone-200 bg-white">
          <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
            <span className="h-1 w-6 bg-blue-700" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Pricing Tiers
            </p>
          </div>
          <div className="divide-y divide-stone-200">
            {UNIT_PRICING_TIERS.map((tier) => (
              <div
                key={tier.label}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-black">
                    {formatTierRange(tier)} units
                  </p>
                  <p className="mt-0.5 text-xs text-black/45">
                    Applies only within this tier
                  </p>
                </div>
                <p className="text-sm font-black text-black">
                  {formatKes(tier.rate)}
                </p>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-stone-50 px-5 py-3">
              <div>
                <p className="text-sm font-bold text-black">500+ units</p>
                <p className="mt-0.5 text-xs text-black/45">
                  Tailored enterprise plan
                </p>
              </div>
              <p className="text-sm font-black text-black">Custom</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
          <span className="h-1 w-6 bg-blue-700" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Optional Integrations
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          {OPTIONAL_INTEGRATION_FEES.map((fee) => (
            <IntegrationCard
              key={fee.id}
              fee={fee}
              onContact={() => handleContact(fee.name)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, detail }) {
  return (
    <div className="border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
          {label}
        </p>
        <Icon className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
      </div>
      <p
        className="mt-3 truncate text-xl font-black tracking-tight text-black"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
        {detail}
      </p>
    </div>
  );
}

function IntegrationCard({ fee, onContact }) {
  const Icon =
    fee.id === "mpesa" ? PlugZap : fee.id === "sms" ? MessageCirclePlus : Settings2;
  const priceLabel =
    fee.billingType === "from"
      ? `From ${formatKes(fee.amount)}`
      : `${formatKes(fee.amount)} one-time`;

  return (
    <div className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-blue-700 text-white">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-sm font-black text-black">{fee.name}</p>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">
            {priceLabel}
          </p>
        </div>
      </div>
      <ul className="mt-4 flex-1 space-y-2">
        {fee.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-black/65">
            <CheckCircle className="h-3.5 w-3.5 text-blue-700" strokeWidth={1.8} />
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onContact}
        className="mt-5 inline-flex items-center justify-center gap-2 border border-blue-700 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 transition-colors hover:bg-blue-50"
      >
        Request Setup
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
