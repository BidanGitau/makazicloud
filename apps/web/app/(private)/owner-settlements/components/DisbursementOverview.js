"use client";

import { formatCurrency } from "@/app/_lib/formatters";

export default function DisbursementOverview({ totals, overview, includeDeposits = true }) {
  return (
    <div className="border border-stone-200 bg-white">
      <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
          Disbursement Overview
        </p>
      </div>
      <div className="divide-y divide-stone-200">
        <OverviewRow
          label="Expected rent"
          value={formatCurrency(totals.expected || 0)}
          note="Billed to registered tenants"
        />
        <OverviewRow
          label="Rent collected"
          value={formatCurrency(totals.gross)}
          note="Rent actually paid this month"
          strong
        />
        <OverviewRow
          label="Deposits"
          value={formatCurrency(includeDeposits ? totals.deposits || 0 : 0)}
          note={
            includeDeposits
              ? "Included in the amount paid to the owner"
              : "Excluded from this disbursement"
          }
        />
        <OverviewRow
          label="Expected to owner"
          value={formatCurrency(totals.expectedPayout || 0)}
          note="If all billed rent is paid"
        />
        <OverviewRow
          label="Less Deductions"
          value={formatCurrency(overview.totalDeductions)}
          note="Commission + maintenance + advances"
          strong
        />
        <OverviewRow
          label="Commission"
          value={formatCurrency(totals.commission)}
          depth={1}
          accent="text-blue-700"
        />
        <OverviewRow
          label="Maintenance"
          value={formatCurrency(totals.maintenance)}
          depth={1}
          accent="text-red-700"
        />
        <OverviewRow
          label="Advances"
          value={formatCurrency(totals.advances)}
          depth={1}
          accent="text-amber-700"
        />
        <OverviewRow
          label="Amount To Be Disbursed"
          value={formatCurrency(overview.amountToDisburse)}
          note="Payable from rent collected this period"
          accent="text-green-700"
          final
        />
      </div>
    </div>
  );
}

function OverviewRow({
  label,
  value,
  note = "",
  depth = 0,
  accent = "text-black",
  strong = false,
  final = false,
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-3 px-3 py-2 ${
        final ? "bg-green-50" : ""
      }`}
    >
      <div className={depth ? "pl-4" : ""}>
        <p
          className={`text-[11px] uppercase tracking-[0.16em] ${
            strong || final ? "font-black text-black" : "font-bold text-black/55"
          }`}
        >
          {depth ? "- " : ""}
          {label}
        </p>
        {note ? <p className="mt-0.5 text-xs text-black/45">{note}</p> : null}
      </div>
      <p
        className={`text-right text-sm tabular-nums ${
          strong || final ? "font-black" : "font-bold"
        } ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
