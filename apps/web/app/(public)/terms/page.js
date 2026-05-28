import { breadcrumbJsonLd, buildMeta } from "@/app/_lib/seo";

export function meta() {
  return buildMeta({
    title: "Terms of Service",
    description:
      "Terms governing use of the Makazicloud property management platform.",
    path: "/terms",
    jsonLd: breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Terms of Service", path: "/terms" },
    ]),
  });
}

const sections = [
  {
    title: "Use of the Platform",
    body: "You agree to use Makazicloud only for lawful business purposes and in a way that does not interfere with the security, availability, or normal operation of the service.",
  },
  {
    title: "Account Responsibility",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for activity performed under your account.",
  },
  {
    title: "Customer Data",
    body: "You retain responsibility for the accuracy, legality, and integrity of the data you upload or manage through Makazicloud.",
  },
  {
    title: "Service Availability",
    body: "We may update, improve, suspend, or limit parts of the platform from time to time to maintain quality, security, and performance.",
  },
  {
    title: "Limitation of Liability",
    body: "Makazicloud is provided on an as-available basis. To the extent permitted by law, we are not liable for indirect, incidental, or consequential losses arising from platform use.",
  },
];

export default function TermsPage() {
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
              Terms of Service.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-black/60 sm:text-lg">
              These terms govern access to and use of the Makazicloud platform.
              By using the service, you agree to them.
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
            Send questions about these terms to{" "}
            <a
              href="mailto:noreply@contact.makazicloud.com"
              className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
            >
              noreply@contact.makazicloud.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
