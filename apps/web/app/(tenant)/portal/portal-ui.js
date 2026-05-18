"use client";

// Tenant-portal-specific UI primitives. Mirrors the editorial pattern used
// in (private) pages so the tenant view feels like the same product.

const TONE_TEXT = {
  blue: "text-blue-700",
  red: "text-red-700",
  green: "text-green-700",
  black: "text-black",
};

export function PortalCard({ title, value, tone = "blue" }) {
  const color = TONE_TEXT[tone] || TONE_TEXT.blue;
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {title}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${color}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="border border-stone-200 bg-white p-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/55">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Rows({ rows, empty }) {
  if (!rows.length) {
    return <p className="text-sm text-black/50">{empty}</p>;
  }

  return (
    <div className="divide-y divide-stone-200">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[110px_1fr] gap-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">
            {row.left}
          </p>
          <div>
            <p
              className={`font-semibold ${TONE_TEXT[row.tone] || TONE_TEXT.black}`}
            >
              {row.title}
            </p>
            <p className="mt-1 text-sm text-black/55">{row.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
