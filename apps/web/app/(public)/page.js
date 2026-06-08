"use client";

import { useEffect, useState } from "react";
import Link from "@/app/_components/AppLink";
import {
  ArrowRight,
  Users,
  Home,
  CreditCard,
  Shield,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { buildMeta, organizationJsonLd, softwareJsonLd } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Property Management Software for Kenya",
    description:
      "Run your rentals end-to-end on Makazicloud — collect rent on M-Pesa, manage tenants and leases, track maintenance, and see real-time financials. Built for Kenyan landlords and property managers.",
    path: "/",
    jsonLd: [organizationJsonLd, softwareJsonLd],
  });
}

const features = [
  {
    icon: Users,
    title: "Tenant Management",
    description:
      "Onboard tenants, track leases, and message them — all from one place.",
  },
  {
    icon: CreditCard,
    title: "Smart Rent Collection",
    description: "M-Pesa, bank, and card payments tracked automatically.",
  },
  {
    icon: Home,
    title: "Maintenance Requests",
    description: "Digital work orders with status tracking and history.",
  },
  {
    icon: TrendingUp,
    title: "Financial Analytics",
    description: "Real-time collection rates, occupancy, and ROI per property.",
  },
  {
    icon: Shield,
    title: "Digital Agreements",
    description: "Generate and store lease documents with e-signatures.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Run your portfolio from any phone, any time.",
  },
];

const stats = [
  { value: "500+", label: "Properties" },
  { value: "2,000+", label: "Tenants" },
  { value: "95%", label: "Collection" },
  { value: "24/7", label: "Support" },
];

const testimonials = [
  {
    name: "Jesse Gitau",
    role: "Property Owner",
    content:
      "Transformed how I manage my 15 rental units. Rent collection is seamless.",
  },
  {
    name: "Catherine Wambui",
    role: "Property Manager",
    content:
      "Maintenance requests save me hours each week. Everything is trackable.",
  },
  {
    name: "Grace Wanjiku",
    role: "Real Estate Investor",
    content:
      "Reporting helped me identify my most profitable properties and optimize.",
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-white">
      <section className="relative grid grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="relative flex min-h-[520px] flex-col justify-between bg-blue-700 px-6 py-12 text-white sm:min-h-[600px] sm:px-12 sm:py-16 lg:min-h-[660px] lg:px-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
            — Property OS for Kenya —
          </p>

          <div
            className={`mt-10 transition-all duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h1
              className="text-4xl font-black uppercase leading-[1] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Manage Rent.
              <br />
              <span className="text-white/30">Track Tenants.</span>
              <br />
              Grow Yield.
            </h1>

            <p className="mt-5 max-w-md text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
              Laptops are for browsing · M-Pesa is for paying · Makazicloud is
              for running it all
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-11 items-center gap-2 bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/90"
              >
                Start Managing
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

          <div className="mt-10 flex items-center gap-6 border-t border-white/10 pt-6 sm:gap-8">
            <div>
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                500<span className="text-white/30">+</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Properties
              </p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                95<span className="text-white/30">%</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Collection
              </p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="hidden sm:block">
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                4.9<span className="text-white/30">/5</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                Rating
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
          <article className="relative w-full max-w-md border border-stone-200 bg-white">
            <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p
                  className="text-base font-black uppercase tracking-tight text-black sm:text-lg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Makazi<span className="text-black/40">cloud</span>
                </p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
                  Property Statement
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
                  Month
                </p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-black">
                  May 2026
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-stone-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
                  Property
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-black">
                  Sunrise Apartments
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
                  Occupancy
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-black">
                  22 / 24
                </p>
              </div>
            </div>

            <div className="px-5 py-4 sm:px-7">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-stone-200 pb-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">
                  Tenant
                </p>
                <p className="text-right text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">
                  Unit
                </p>
                <p className="text-right text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">
                  Paid
                </p>
              </div>
              <ul className="divide-y divide-stone-100">
                {[
                  { name: "Jane Muthoni", unit: "A1", paid: "18,000" },
                  { name: "Stephen Otieno", unit: "A2", paid: "18,000" },
                  { name: "Faith Kamau", unit: "B1", paid: "22,000" },
                  { name: "David Mwenda", unit: "B3", paid: "15,500" },
                ].map((r) => (
                  <li
                    key={r.unit}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5"
                  >
                    <p className="truncate text-[11px] font-medium text-black">
                      {r.name}
                    </p>
                    <p className="text-right font-mono text-[10px] tabular-nums text-black/60">
                      {r.unit}
                    </p>
                    <p
                      className="text-right text-[11px] font-black tabular-nums text-black"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {r.paid}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t-2 border-blue-700 px-5 py-4 sm:px-7">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">
                  Collected This Month
                </span>
                <span
                  className="text-base font-black tabular-nums text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  KES 486,000
                </span>
              </div>
              <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-black/35">
                Auto-reconciled · 82% of billed rent
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-stone-200 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-8 text-center sm:py-10">
                <p
                  className="text-2xl font-black tabular-nums text-black sm:text-3xl"
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

      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-col gap-3 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
              — Everything in one place —
            </p>
            <h2
              className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Run your portfolio.
              <br />
              <span className="text-black/30">Skip the spreadsheets.</span>
            </h2>
          </div>
          <Link
            href="/management-signup"
            className="hidden items-center gap-2 border-b border-blue-700/40 pb-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:border-blue-700 sm:inline-flex"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative bg-white p-8 transition-colors hover:bg-stone-50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center border border-blue-700/10 bg-white">
                  <Icon className="h-5 w-5 text-black" strokeWidth={1.8} />
                </div>
                <h3
                  className="mt-6 text-lg font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-black/55">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
            — From our customers —
          </p>
          <h2
            className="mt-3 max-w-3xl text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Trusted by property professionals.
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
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
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
        </div>
      </section>

      <section className="bg-blue-700">
        <div className="container mx-auto px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
                — Ready when you are —
              </p>
              <h2
                className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start managing.
                <br />
                <span className="text-white/30">No spreadsheet required.</span>
              </h2>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
              <Link
                href="/management-signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/90"
              >
                Start Free Trial
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center border border-white/30 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
          <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            No credit card · 30-day trial · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
