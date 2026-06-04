export default function ArrearsSummary({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200">
      <SummaryItem
        label="Tenants in Arrears"
        value={summary.tenantsInArrears}
        valueClassName="text-red-600"
      />
      <SummaryItem
        label="Paid in Advance"
        value={summary.tenantsInAdvance}
        valueClassName="text-blue-700"
      />
    </div>
  );
}

function SummaryItem({ label, value, valueClassName }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${valueClassName}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
