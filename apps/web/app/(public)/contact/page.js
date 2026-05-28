"use client";

import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import {
  AppForm,
  TextField,
  TextAreaField,
  SelectField,
  SubmitButton,
} from "@/app/_components/forms";
import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Contact Sales & Support",
    description:
      "Talk to the Makazicloud team — sales, onboarding, partnerships, or technical support. Reach us by email, phone, or WhatsApp.",
    path: "/contact",
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
    ]),
  });
}

const contactMethods = [
  {
    icon: Mail,
    label: "Email",
    detail: "support@makazicloud.com",
    href: "mailto:support@makazicloud.com",
    helper: "Reply within 24 hours",
  },
  {
    icon: Phone,
    label: "Phone",
    detail: "+254 700 123 456",
    href: "tel:+254700123456",
    helper: "Mon–Fri · 9am–6pm",
  },
  {
    icon: MessageCircle,
    label: "Live Chat",
    detail: "Talk in real time",
    href: "#",
    helper: "Available 9am–6pm",
  },
  {
    icon: MapPin,
    label: "Office",
    detail: "Nairobi, Kenya",
    href: "#",
    helper: "By appointment",
  },
];

const faqs = [
  {
    question: "How quickly can I get started?",
    answer:
      "Sign up and add your first property in under five minutes. The guided setup walks you through everything.",
  },
  {
    question: "Do you support M-Pesa?",
    answer:
      "Yes — M-Pesa, Equity Bank, KCB, and other major Kenyan payment providers integrate for automatic rent collection.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "30-day free trial with full access. No credit card required to start.",
  },
  {
    question: "Can I manage multiple properties?",
    answer:
      "Makazicloud handles unlimited properties — from single units to portfolios with hundreds of units.",
  },
];

const officeHours = [
  { day: "Monday – Friday", hours: "9:00 – 18:00" },
  { day: "Saturday", hours: "10:00 – 16:00" },
  { day: "Sunday", hours: "Closed" },
];

const contactSchema = z.object({
  contactType: z.string().min(1, "Choose a topic"),
  name: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Tell us a bit more (10+ chars)"),
});

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="bg-white text-black">
      <section className="bg-blue-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
              — We're here to help —
            </p>
            <h1
              className="mt-3 text-4xl font-black uppercase leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Get in touch.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
              Questions about Makazicloud? Our team helps landlords and managers
              succeed every day.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map((m) => {
              const Icon = m.icon;
              return (
                <a
                  key={m.label}
                  href={m.href}
                  className="group flex items-start gap-4 bg-white p-6 transition-colors hover:bg-stone-50 sm:p-8"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center border border-blue-700/10 bg-white">
                    <Icon className="h-5 w-5 text-black" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-black/40">
                      {m.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-black">
                      {m.detail}
                    </p>
                    <p className="mt-1 text-[11px] text-black/45">{m.helper}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
              — Send a message —
            </p>
            <h2
              className="mt-3 text-base font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tell us more.
              <br />
              <span className="text-black/30">We reply in 24 hours.</span>
            </h2>

            {isSubmitted ? (
              <div className="mt-10 border border-blue-700 bg-white p-10 text-center">
                <p
                  className="text-2xl font-black uppercase tracking-tight text-black sm:text-base"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Message Sent.
                </p>
                <p className="mt-3 text-sm text-black/55">
                  Thank you. We'll be in touch within 24 hours.
                </p>
              </div>
            ) : (
              <AppForm
                schema={contactSchema}
                defaultValues={{
                  contactType: "general",
                  name: "",
                  email: "",
                  phone: "",
                  subject: "",
                  message: "",
                }}
                onSubmit={handleSubmit}
                resetOnSuccess
                className="mt-10 space-y-6"
              >
                <SelectField
                  name="contactType"
                  label="What can we help with?"
                  options={[
                    { value: "general", label: "General Inquiry" },
                    { value: "support", label: "Technical Support" },
                    { value: "sales", label: "Sales Questions" },
                    { value: "demo", label: "Request Demo" },
                    { value: "partnership", label: "Partnership" },
                  ]}
                  allowClear={false}
                />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <TextField
                    name="name"
                    label="Full Name"
                    placeholder="Jane Muthoni"
                    required
                  />
                  <TextField
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <TextField
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    placeholder="+254 700 000 000"
                  />
                  <TextField
                    name="subject"
                    label="Subject"
                    placeholder="Brief subject"
                    required
                  />
                </div>

                <TextAreaField
                  name="message"
                  label="Message"
                  rows={6}
                  placeholder="Tell us how we can help."
                  required
                />

                <SubmitButton>Send Message</SubmitButton>
              </AppForm>
            )}
          </div>

          <aside className="space-y-10 lg:pt-10">
            <div className="border border-stone-200 p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
                — Office hours —
              </p>
              <ul className="mt-6 space-y-3">
                {officeHours.map((s) => (
                  <li
                    key={s.day}
                    className="flex items-baseline justify-between border-b border-stone-100 pb-2 last:border-b-0"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
                      {s.day}
                    </span>
                    <span className="font-mono text-[12px] font-bold tabular-nums text-black">
                      {s.hours}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-700 p-8 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
                — Why Makazicloud —
              </p>
              <ul className="mt-6 space-y-4 text-[12px] font-bold uppercase tracking-[0.18em] text-white/75">
                <li className="flex items-center gap-3">
                  <span className="h-px w-6 bg-white/40" />
                  2,000+ Active Users
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-px w-6 bg-white/40" />
                  95% Customer Satisfaction
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-px w-6 bg-white/40" />
                  24/7 Support
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-stone-50">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
            — Frequently asked —
          </p>
          <h2
            className="mt-3 max-w-2xl text-base font-black uppercase leading-[1.05] tracking-tight text-black sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Questions, answered.
          </h2>

          <ol className="mx-auto mt-12 max-w-4xl divide-y divide-stone-200 border-y border-stone-200">
            {faqs.map((f, idx) => (
              <li
                key={f.question}
                className="grid grid-cols-[auto_1fr] gap-6 py-8 sm:gap-10 sm:py-10"
              >
                <p
                  className="font-mono text-xl font-black tabular-nums text-black/30 sm:text-2xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3
                    className="text-lg font-black uppercase tracking-tight text-black sm:text-xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {f.question}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-black/65 sm:text-base">
                    {f.answer}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mx-auto mt-12 max-w-4xl text-center text-sm text-black/55">
            Still have questions?{" "}
            <a
              href="mailto:support@makazicloud.com"
              className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
            >
              Email us directly
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
