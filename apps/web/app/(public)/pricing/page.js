"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/app/_components/AppLink";
import {
  ArrowRight,
  Building2,
  ChartColumnIncreasing,
  CheckCircle2,
  FileText,
  Gift,
  Layers,
  MessageCirclePlus,
  Phone,
  PlugZap,
  Settings2,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";
import {
  calculateProgressiveUnitPricing,
  MINIMUM_MONTHLY_FEE,
  OPTIONAL_INTEGRATION_FEES,
  UNIT_PRICING_TIERS,
} from "@/app/_lib/subscriptionPlans";
import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Pricing",
    description:
      "Simple MakaziCloud pricing that grows with your portfolio — KES 2,000 base for up to 25 units, progressive per-unit bands, and optional M-Pesa or SMS integrations.",
    path: "/pricing",
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Pricing", path: "/pricing" },
    ]),
  });
}

const formatKes = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE")}`;

const bandRows = UNIT_PRICING_TIERS.filter((tier) => tier.from > 1).map(
  (tier) => ({
    portfolio: tier.to
      ? `${tier.from} - ${tier.to} units`
      : `Above ${tier.from - 1} units`,
    rate: tier.to ? `${formatKes(tier.rate)} / unit` : "Enterprise pricing",
    enterprise: !tier.to,
  }),
);

const includedFeatures = [
  {
    icon: Building2,
    title: "Property & units",
    description: "Portfolio, blocks, and unit inventory in one place.",
  },
  {
    icon: Users,
    title: "Tenant management",
    description: "Onboarding, leases, and a tenant portal.",
  },
  {
    icon: FileText,
    title: "Lease tracking",
    description: "Agreements, renewals, and due dates organised.",
  },
  {
    icon: Layers,
    title: "Utility management",
    description: "Meter readings, bills, and unit assignments.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    description: "Requests, advances, and owner settlements.",
  },
  {
    icon: Smartphone,
    title: "Rent collection",
    description: "Payments, refunds, and arrears follow-ups.",
  },
  {
    icon: ChartColumnIncreasing,
    title: "Reports & dashboard",
    description: "Month-to-month insights for your portfolio.",
  },
  {
    icon: Phone,
    title: "Kenya support",
    description: "Local setup help for landlords and managers.",
  },
];

const integrationMeta = {
  mpesa: {
    icon: PlugZap,
    accent: "bg-blue-700 text-white",
    chip: "Payments",
    blurb: "Collect rent instantly with STK Push, C2B, and payouts.",
  },
  sms: {
    icon: MessageCirclePlus,
    accent: "bg-black text-white",
    chip: "Messaging",
    blurb: "Send rent reminders, payment alerts, and lease notices.",
  },
  custom: {
    icon: Settings2,
    accent: "bg-stone-800 text-white",
    chip: "Custom",
    blurb: "Workflows, API access, and analytics shaped to your ops.",
  },
};

const UNIT_PRESETS = [25, 50, 100, 150, 200];

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [unitCount, setUnitCount] = useState(40);

  useEffect(() => setMounted(true), []);

  const pricing = useMemo(
    () => calculateProgressiveUnitPricing(unitCount),
    [unitCount],
  );
  const isEnterprise = unitCount > 200;

  return (
    <div className="bg-white text-black">
      <section className="relative grid grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="relative flex min-h-[560px] flex-col justify-between bg-blue-700 px-6 py-12 text-white sm:min-h-[640px] sm:px-12 sm:py-16 lg:min-h-[700px] lg:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.28), transparent 32%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.14), transparent 24%)",
            }}
          />

          <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
            — Pricing for Kenya landlords —
          </p>

          <div
            className={`relative mt-10 transition-all duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h1
              className="text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Makazi
              <span className="text-white/35">Cloud</span>
              <br />
              Pricing.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
              Clear monthly base. Pay by portfolio band as you grow. Add M-Pesa
              or SMS only when you need them.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-11 items-center gap-2 bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/90"
              >
                Start free trial
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="border-b border-white/20 pb-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors hover:border-white hover:text-white"
              >
                Talk to sales
              </Link>
            </div>
          </div>

          <div className="relative mt-12 flex items-center gap-6 border-t border-white/10 pt-6 sm:gap-8">
            <div>
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                {formatKes(MINIMUM_MONTHLY_FEE).replace("KES ", "")}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Base / month
              </p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                25
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Units included
              </p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="hidden sm:block">
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                2
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Months free
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-stone-50 px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
          <article
            className={`relative w-full max-w-md border border-stone-200 bg-white transition-all delay-100 duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p
                  className="text-base font-black uppercase tracking-tight text-black sm:text-lg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Estimate
                </p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
                  Monthly subscription
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center bg-blue-700 text-white">
                <Building2 size={18} strokeWidth={1.8} />
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                    Units managed
                  </p>
                  <p
                    className="mt-2 text-4xl font-black tabular-nums tracking-tight text-black"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {unitCount}
                  </p>
                </div>
                <p className="pb-1 text-right text-xs font-medium text-black/45">
                  Drag or pick a size
                </p>
              </div>

              <input
                type="range"
                min="1"
                max="250"
                value={unitCount}
                onChange={(event) => setUnitCount(Number(event.target.value))}
                className="mt-5 h-2 w-full cursor-pointer appearance-none bg-stone-200 accent-blue-700"
                aria-label="Number of units"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {UNIT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUnitCount(preset)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                      unitCount === preset
                        ? "bg-blue-700 text-white"
                        : "bg-stone-100 text-black/55 hover:bg-stone-200 hover:text-black"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="mt-8 border-t border-stone-200 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                  Estimated monthly
                </p>
                <p
                  className="mt-2 text-4xl font-black tracking-tight text-black sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {isEnterprise ? "Custom" : formatKes(pricing.monthlyTotal)}
                </p>
                <p className="mt-2 text-sm text-black/55">
                  {isEnterprise
                    ? "Above 200 units uses enterprise pricing."
                    : "Includes the KES 2,000 base for the first 25 units."}
                </p>
              </div>

              {!isEnterprise && pricing.lines.length > 0 && (
                <ul className="mt-5 space-y-2 border border-stone-200 bg-stone-50 p-4">
                  {pricing.lines.map((line) => (
                    <li
                      key={`${line.from}-${line.to}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-black/60">{line.label}</span>
                      <span className="font-semibold tabular-nums text-black">
                        {formatKes(line.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-7">
              <Link
                href={isEnterprise ? "/contact" : "/management-signup"}
                className="group inline-flex w-full min-h-11 items-center justify-center gap-2 bg-blue-700 px-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                {isEnterprise ? "Request enterprise quote" : "Start with this plan"}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-stone-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-stone-200 md:grid-cols-4">
            {[
              { value: formatKes(MINIMUM_MONTHLY_FEE), label: "Base monthly" },
              { value: "25 units", label: "Included" },
              { value: "2 months", label: "Free to start" },
              { value: "Optional", label: "Integrations" },
            ].map((item) => (
              <div key={item.label} className="px-4 py-8 text-center sm:py-10">
                <p
                  className="text-xl font-black tabular-nums text-black sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.value}
                </p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-black/40 sm:text-[10px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-col gap-3 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
              — Included in base —
            </p>
            <h2
              className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              One platform.
              <br />
              <span className="text-black/30">Full rental operations.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-black/55">
            Every base subscription includes the core tools landlords and
            managers use every day.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {includedFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group bg-white p-7 transition-colors hover:bg-stone-50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center border border-blue-700/10 bg-white text-blue-700 transition-colors group-hover:border-blue-700 group-hover:bg-blue-700 group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3
                  className="mt-6 text-lg font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-black/55">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
                — Portfolio bands —
              </p>
              <h2
                className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pay as you scale.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-black/55 sm:text-base">
                The base covers up to 25 units. Extra units are billed by the
                band they fall under — no surprise plan jumps.
              </p>
              <Link
                href="/management-signup"
                className="mt-8 inline-flex items-center gap-2 border-b border-blue-700/40 pb-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:border-blue-700"
              >
                Create workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {bandRows.map((row, index) => (
                <div
                  key={row.portfolio}
                  className={`flex items-center justify-between gap-4 px-5 py-5 transition-transform hover:-translate-y-0.5 ${
                    row.enterprise
                      ? "bg-black text-white"
                      : "border border-stone-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-10 w-10 items-center justify-center text-[11px] font-black ${
                        row.enterprise
                          ? "bg-white/10 text-white"
                          : "bg-blue-700 text-white"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {row.portfolio}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          row.enterprise ? "text-white/55" : "text-black/45"
                        }`}
                      >
                        {row.enterprise
                          ? "Custom onboarding and support"
                          : "Billed per additional unit"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-right text-sm font-black sm:text-base ${
                      row.enterprise ? "text-white" : "text-blue-700"
                    }`}
                  >
                    {row.rate}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-10 max-w-2xl sm:mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
            — Optional add-ons —
          </p>
          <h2
            className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Plug in what you need.
            <br />
            <span className="text-black/30">Keep monthly costs steady.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-3">
          {OPTIONAL_INTEGRATION_FEES.map((fee) => {
            const meta = integrationMeta[fee.id] || integrationMeta.custom;
            const Icon = meta.icon;
            const amountLabel =
              fee.billingType === "from"
                ? `From ${formatKes(fee.amount)}+`
                : `${formatKes(fee.amount)} one-time`;

            return (
              <div
                key={fee.id}
                className="group flex h-full flex-col bg-white p-8 transition-colors hover:bg-stone-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center ${meta.accent}`}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <span className="bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
                    {meta.chip}
                  </span>
                </div>

                <h3
                  className="mt-7 text-xl font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fee.name}
                </h3>
                <p className="mt-2 text-base font-bold text-blue-700">
                  {amountLabel}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-black/55">
                  {meta.blurb}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {fee.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-black/65"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"
                        strokeWidth={1.8}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-blue-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center bg-white text-blue-700">
                  <Gift size={20} strokeWidth={1.8} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                  First-time customer offer
                </p>
              </div>
              <h2
                className="mt-5 text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Enjoy 2 months free.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">
                Open MakaziCloud, set up your first properties, and run rent
                collection without paying for the first two months.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-colors hover:bg-stone-100"
              >
                Open MakaziCloud
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="text-sm text-white/65">
                0703 947 052 · bydangitau@gmail.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
