import { ArrowRight, MapPin } from "lucide-react";
import Link from "@/app/_components/AppLink";

function PropertyCard({ property, index }) {
  const { id, name, address, totalUnits, vacantUnits, availableUnitTypes } =
    property;

  return (
    <article
      className="group flex flex-col bg-white p-7 transition-colors hover:bg-stone-50"
      style={{
        animation: `fadeUp 0.5s ease-out ${index * 60}ms both`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="section-label">
            — Listing No. {String(index + 1).padStart(2, "0")} —
          </p>
          <h3
            className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {name}
          </h3>
          {address && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-black/55">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
              <span className="truncate">{address}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 border-2 border-blue-700 px-4 py-3 text-center">
          <p
            className="font-mono text-2xl font-black tabular-nums leading-none text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {vacantUnits}
          </p>
          <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.22em] text-black/55">
            Vacant
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 divide-x divide-stone-200 border-y border-stone-200">
        <div className="px-4 py-4 text-center">
          <p
            className="font-mono text-xl font-black tabular-nums text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {totalUnits}
          </p>
          <p className="section-label mt-1">Total Units</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p
            className="font-mono text-xl font-black tabular-nums text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {totalUnits - vacantUnits}
          </p>
          <p className="section-label mt-1">Occupied</p>
        </div>
      </div>

      {availableUnitTypes.length > 0 && (
        <div className="mt-6">
          <p className="section-label">— Open Unit Types —</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {availableUnitTypes.map((unitType) => (
              <span
                key={unitType}
                className="inline-flex items-center border border-stone-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black/70"
              >
                {unitType}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/properties/${id}`}
        className="group/btn mt-8 inline-flex min-h-11 items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
      >
        View Vacant Units
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
      </Link>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}

export default PropertyCard;
