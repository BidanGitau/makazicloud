"use client";

import { useState, useEffect } from "react";
import Link from "@/app/_components/AppLink";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Users,
  TrendingUp,
  Home,
  CreditCard,
  ArrowRight,
  Target,
  Lightbulb,
  Heart,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const stats = [
  { value: "500+", label: "Properties" },
  { value: "2,000+", label: "Active Users" },
  { value: "95%", label: "Collection" },
  { value: "24/7", label: "Support" },
];

const features = [
  {
    icon: Home,
    title: "Property Management",
    description:
      "Multiple properties from one dashboard — units, maintenance, and occupancy.",
  },
  {
    icon: Users,
    title: "Tenant Management",
    description:
      "Onboarding, lease tracking, and communication — keep tenants happy.",
  },
  {
    icon: CreditCard,
    title: "Payments & Billing",
    description: "M-Pesa, bank transfers, automated billing — no follow-up.",
  },
];

const values = [
  {
    icon: Target,
    title: "Built for Kenya",
    description:
      "M-Pesa first, local compliance built in. Not a port from somewhere else.",
  },
  {
    icon: Lightbulb,
    title: "Simple by Design",
    description:
      "If you can use a smartphone, you can run properties with Makazicloud.",
  },
  {
    icon: Heart,
    title: "Landlord & Tenant",
    description:
      "Both sides served. Happy tenants pay on time. Empowered landlords grow.",
  },
];

const testimonials = [
  {
    name: "Jesse Gitau",
    role: "Property Owner, Nairobi",
    content:
      "Automated rent collection saves me hours every week. 15 units run themselves.",
    initials: "JG",
  },
  {
    name: "Catherine Wambui",
    role: "Real Estate Manager, Mombasa",
    content:
      "The dashboard gives me insights I never had. Data-driven decisions, finally.",
    initials: "CW",
  },
  {
    name: "Grace Wanjiku",
    role: "Property Investor, Kisumu",
    content:
      "M-Pesa integration is seamless. Tenant portal cuts my support requests.",
    initials: "GW",
  },
];

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rentData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Collection Rate (%)",
        data: [85, 92, 88, 96, 91, 98],
        borderColor: "rgba(255,255,255,0.9)",
        backgroundColor: "rgba(255,255,255,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#000000",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        min: 80,
        max: 100,
        grid: { color: "rgba(255,255,255,0.08)" },
        ticks: {
          color: "rgba(255,255,255,0.6)",
          font: { size: 10, weight: "600" },
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "rgba(255,255,255,0.6)",
          font: { size: 10, weight: "600" },
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-white text-black">
      {/* HERO */}
      <section className="bg-blue-700 text-white">
        <div className="container mx-auto px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div
            className={`max-w-3xl transition-all duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
              — Built in Nairobi, for Kenya —
            </p>
            <h1
              className="mt-4 text-4xl font-black uppercase leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The smarter way
              <br />
              <span className="text-white/30">to manage property.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
              Makazicloud helps landlords and property managers collect rent on
              time, track tenants, manage maintenance, and grow portfolios —
              from one platform.
            </p>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-4">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-11 items-center gap-2 bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/properties"
                className="border-b border-white/20 pb-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors hover:border-white hover:text-white"
              >
                Browse Properties
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-stone-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-stone-200 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-8 text-center sm:py-10">
                <p
                  className="text-3xl font-black tabular-nums text-black sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-black/40 sm:text-[10px]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
              — Our Story —
            </p>
            <h2
              className="mt-3 text-3xl font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              We built Makazicloud
              <br />
              <span className="text-black/30">because rent was broken.</span>
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-black/65 lg:col-span-7 lg:pt-2">
            <p>
              Too many landlords were still collecting rent in cash, tracking
              tenants in notebooks, and spending weekends chasing unpaid bills.
              Tenants had no transparency, no receipts, no easy way to
              communicate issues.
            </p>
            <p>
              We set out to fix that. Makazicloud brings rent collection, tenant
              management, maintenance, and financial reporting into a single
              platform — built specifically for how property business works in
              Kenya.
            </p>
            <p>
              Hundreds of landlords across Nairobi, Mombasa, and Kisumu trust us
              today. We're just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-stone-50">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
            — What we stand for —
          </p>
          <h2
            className="mt-3 max-w-2xl text-3xl font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three principles
            <br />
            <span className="text-black/30">that guide everything.</span>
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-3">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white p-8 sm:p-10">
                  <div className="inline-flex h-12 w-12 items-center justify-center border border-blue-700/10 bg-white">
                    <Icon className="h-5 w-5 text-black" strokeWidth={1.8} />
                  </div>
                  <h3
                    className="mt-6 text-lg font-black uppercase tracking-tight text-black"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/55">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES — list style */}
      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
          — Everything in one place —
        </p>
        <h2
          className="mt-3 max-w-2xl text-3xl font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Purpose-built tools.
          <br />
          <span className="text-black/30">For the Kenyan market.</span>
        </h2>

        <ol className="mt-12 divide-y divide-stone-200 border-y border-stone-200">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="grid grid-cols-[auto_1fr] items-start gap-6 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-12 sm:py-10"
              >
                <p
                  className="font-mono text-2xl font-black tabular-nums text-black/30 sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3
                    className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/55 sm:text-base">
                    {f.description}
                  </p>
                </div>
                <div className="hidden h-14 w-14 items-center justify-center border border-blue-700/10 sm:inline-flex">
                  <Icon className="h-6 w-6 text-black" strokeWidth={1.6} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ANALYTICS */}
      <section className="bg-blue-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
                — Real-time analytics —
              </p>
              <h2
                className="mt-3 text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Know your numbers.
                <br />
                <span className="text-white/30">At all times.</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
                Dashboards track rent collection, occupancy trends, and
                financial performance across your portfolio.
              </p>
              <ul className="mt-6 space-y-3 text-[12px] font-bold uppercase tracking-[0.18em] text-white/65">
                {[
                  "Monthly collection tracking",
                  "Occupancy trend analysis",
                  "Revenue optimization insights",
                  "Automated financial reports",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-px w-6 bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/15 bg-white/[0.04] p-8 sm:p-10">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                  Collection — last 6 months
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                  Avg
                </span>
              </div>
              <p
                className="mt-2 text-5xl font-black tabular-nums text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                95.8%
              </p>
              <div className="mt-8 h-44 sm:h-52">
                <Line data={rentData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
          — From our customers —
        </p>
        <h2
          className="mt-3 max-w-2xl text-3xl font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trusted across Kenya.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex h-full flex-col justify-between bg-white p-8"
            >
              <blockquote
                className="text-lg font-medium leading-snug tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                &ldquo;{t.content}&rdquo;
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3 border-t border-stone-200 pt-5">
                <div className="flex h-9 w-9 items-center justify-center bg-blue-700 text-[11px] font-bold uppercase tracking-wider text-white">
                  {t.initials}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-black">{t.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                    {t.role}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700">
        <div className="container mx-auto px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
                — Ready when you are —
              </p>
              <h2
                className="mt-3 text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to get started?
              </h2>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/90"
              >
                Start Free Today
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/properties"
                className="inline-flex min-h-12 items-center justify-center border border-white/30 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Browse Properties
              </Link>
            </div>
          </div>
          <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            No setup fees · 30-day trial · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
