"use client";

import { useState } from "react";
import {
  ChevronDown,
  Headset,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  X,
} from "lucide-react";

const SUPPORT_CONTACT = {
  ownerName: "System Owner",
  email: "bydangitau@gmail.com",
  phoneDisplay: "0703947052",
  phoneSms: "0703947052",
  phoneWhatsapp: "254703947052",
};

const SUPPORT_FAQS = [
  {
    question: "How do I record rent payments?",
    answer:
      "Go to Payments, choose the tenant, enter the amount paid, payment date, method, and reference, then save the payment.",
  },
  {
    question: "Why are arrears showing for a tenant?",
    answer:
      "Arrears are calculated from rent due minus payments received. Confirm the tenant rent amount, billing month, and any unassigned payments.",
  },
  {
    question: "How do I close an owner disbursement?",
    answer:
      "Open Owner Disbursements, select the month and property, review rent collected, arrears, deductions, and amount to be disbursed, then save.",
  },
  {
    question: "Can I generate reports or PDFs?",
    answer:
      "Yes. Open the relevant report page or disbursement panel, apply filters, then use the PDF export button when your account has export permission.",
  },
];

function supportMessage() {
  return encodeURIComponent(
    "Hello, I need help with MakaziCloud. Please assist.",
  );
}

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  const mailHref = `mailto:${SUPPORT_CONTACT.email}?subject=${encodeURIComponent(
    "MakaziCloud Support Request",
  )}&body=${supportMessage()}`;
  const smsHref = `sms:${SUPPORT_CONTACT.phoneSms}?&body=${supportMessage()}`;
  const whatsappHref = `https://wa.me/${SUPPORT_CONTACT.phoneWhatsapp}?text=${supportMessage()}`;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="mb-3 w-[min(calc(100vw-2rem),25rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-slate-950 px-4 py-4 text-white">
            <div className="absolute right-4 top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg">
                    <Headset className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                      Help Center
                    </p>
                    <h2
                      className="text-base font-black uppercase tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Need Support?
                    </h2>
                  </div>
                </div>
                <p className="mt-3 max-w-xs text-xs leading-5 text-white/75">
                  Browse quick answers or contact the system owner directly.
                </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition-colors hover:bg-white hover:text-blue-700"
              aria-label="Close support"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              <SupportAction href={mailHref} label="Email" Icon={Mail} />
              <SupportAction href={smsHref} label="SMS" Icon={MessageSquareText} />
              <SupportAction
                href={whatsappHref}
                label="WhatsApp"
                Icon={MessageCircle}
                external
              />
            </div>

            <div className="border border-stone-200">
              <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
                  Frequently Asked Questions
                </p>
              </div>
              <div className="divide-y divide-stone-200">
                {SUPPORT_FAQS.map((faq, index) => {
                  const expanded = activeFaq === index;
                  return (
                    <div key={faq.question}>
                      <button
                        type="button"
                        onClick={() => setActiveFaq(expanded ? -1 : index)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-stone-50"
                        aria-expanded={expanded}
                      >
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-black">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 text-black/45 transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.8}
                        />
                      </button>
                      {expanded && (
                        <p className="px-3 pb-3 text-sm leading-6 text-black/60">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-blue-100 bg-blue-50 px-3 py-3">
              <p className="text-xs font-bold text-black">
                Still stuck? Contact {SUPPORT_CONTACT.ownerName}.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/60">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {SUPPORT_CONTACT.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {SUPPORT_CONTACT.phoneDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="group ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-slate-950 text-white shadow-[0_18px_45px_rgba(37,99,235,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(37,99,235,0.55)] focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
        aria-label={isOpen ? "Close support" : "Open support"}
        title="Support"
      >
        <span className="absolute h-16 w-16 rounded-full border border-blue-300/50 opacity-70 transition-transform group-hover:scale-110" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          {isOpen ? (
            <X className="h-6 w-6" strokeWidth={2} />
          ) : (
            <Headset className="h-6 w-6" strokeWidth={2} />
          )}
        </span>
      </button>
    </div>
  );
}

function SupportAction({ href, label, Icon, external = false }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-black/65 shadow-sm transition-colors hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
    >
      <Icon className="h-5 w-5" strokeWidth={1.8} />
      {label}
    </a>
  );
}
