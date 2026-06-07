import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Privacy Policy",
    description:
      "How Makazicloud collects, uses, and protects landlord, manager, and tenant information across the platform.",
    path: "/privacy",
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Privacy Policy", path: "/privacy" },
    ]),
  });
}

const sections = [
  {
    title: "Information We Collect",
    body: "Account details, contact information, tenancy and property records, payment metadata, and any information submitted while using Makazicloud.",
  },
  {
    title: "How We Use Information",
    body: "To operate the platform, authenticate users, send account notifications, manage property workflows, improve product reliability, and comply with legal obligations.",
  },
  {
    title: "Data Sharing",
    body: "Information is shared only with service providers and infrastructure partners that help us run Makazicloud, or when required by law. We do not sell personal data.",
  },
  {
    title: "Data Security",
    body: "We use reasonable technical and organizational safeguards to protect information against unauthorized access, loss, misuse, or disclosure.",
  },
  {
    title: "Your Choices",
    body: "Request updates or corrections to your account information and contact us with questions about how your data is handled.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-white text-black">
      <section className="border-b border-stone-200">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
              — Legal —
            </p>
            <h1
              className="mt-3 text-base font-black uppercase leading-[1.02] tracking-tight text-black sm:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Privacy Policy.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-black/60 sm:text-lg">
              How Makazicloud collects, uses, stores, and protects personal
              information when you use our platform and related services.
            </p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              Last updated · May 2026
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <ol className="mx-auto max-w-3xl divide-y divide-stone-200 border-y border-stone-200">
          {sections.map((s, idx) => (
            <li
              key={s.title}
              className="grid grid-cols-[auto_1fr] gap-6 py-8 sm:gap-10 sm:py-10"
            >
              <p
                className="font-mono text-xl font-black tabular-nums text-black/30 sm:text-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {String(idx + 1).padStart(2, "0")}
              </p>
              <div>
                <h2
                  className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-black/65 sm:text-base">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-16 max-w-3xl border-t-2 border-black pt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
            — Questions? —
          </p>
          <p className="mt-3 text-base text-black/70 sm:text-lg">
            For privacy-related questions, write to{" "}
            <a
              href="mailto:noreply@support.makazicloud.com"
              className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
            >
              noreply@support.makazicloud.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
