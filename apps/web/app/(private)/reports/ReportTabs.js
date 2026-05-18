"use client";

import Link from "@/app/_components/AppLink";

const TABS = [
  { id: "tenant", label: "Tenant", href: "/reports/tenant" },
  { id: "financial", label: "Financial", href: "/reports/financial" },
];

export default function ReportTabs({ active }) {
  return (
    <div className="flex w-fit border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em]">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-5 py-2 transition-colors ${
            tab.id === active
              ? "bg-blue-700 text-white"
              : "bg-white text-black/55 hover:bg-stone-50"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
