"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Headset,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
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
  const [activeFaq, setActiveFaq] = useState(-1);

  const mailHref = `mailto:${SUPPORT_CONTACT.email}?subject=${encodeURIComponent(
    "MakaziCloud Support Request",
  )}&body=${supportMessage()}`;
  const smsHref = `sms:${SUPPORT_CONTACT.phoneSms}?&body=${supportMessage()}`;
  const whatsappHref = `https://wa.me/${SUPPORT_CONTACT.phoneWhatsapp}?text=${supportMessage()}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest(".support-menu")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="support-menu relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="p-2 text-black/55 transition-colors hover:bg-stone-50 hover:text-black"
        aria-label="Support"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Support"
      >
        <Headset className="h-5 w-5" strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[min(calc(100vw-2rem),21rem)] border border-stone-200 bg-white shadow-2xl">
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">
              Support
            </p>
            <p className="text-[11px] text-black/50">
              Quick answers or contact the system owner
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-stone-200 p-3">
            <SupportAction href={mailHref} label="Email" Icon={Mail} />
            <SupportAction href={smsHref} label="SMS" Icon={MessageSquareText} />
            <SupportAction
              href={whatsappHref}
              label="WhatsApp"
              Icon={MessageCircle}
              external
            />
          </div>

          <div className="max-h-56 overflow-y-auto border-b border-stone-200">
            {SUPPORT_FAQS.map((faq, index) => {
              const expanded = activeFaq === index;
              return (
                <div key={faq.question} className="border-b border-stone-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(expanded ? -1 : index)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
                    aria-expanded={expanded}
                  >
                    <span className="text-[11px] font-bold text-black">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-black/45 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                      strokeWidth={1.8}
                    />
                  </button>
                  {expanded && (
                    <p className="px-4 pb-3 text-[11px] leading-5 text-black/60">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1 px-4 py-3 text-[11px] text-black/60">
            <p className="font-bold text-black">
              {SUPPORT_CONTACT.ownerName}
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
              {SUPPORT_CONTACT.email}
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
              {SUPPORT_CONTACT.phoneDisplay}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SupportAction({ href, label, Icon, external = false }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex flex-col items-center justify-center gap-1.5 border border-stone-200 bg-stone-50 px-2 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-black/65 transition-colors hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      {label}
    </a>
  );
}
