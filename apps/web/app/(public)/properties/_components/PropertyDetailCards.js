import { Bed, Building2, Home, Layers3 } from "lucide-react";

export function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white px-5 py-6 text-center">
      <Icon className="mx-auto h-5 w-5 text-black/55" strokeWidth={1.6} />
      <p
        className="mt-3 font-mono text-base font-black tabular-nums text-black"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="section-label mt-1">{label}</p>
    </div>
  );
}

export function UnitCard({ unit, index }) {
  const unitNumber = unit.unit_number || unit.unitNumber;
  const unitType = unit.unit_type || unit.type;
  const blockName = unit.block_name || unit.blockName;

  return (
    <article className="group flex flex-col bg-white p-7 transition-colors hover:bg-stone-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="section-label">
            — Unit No. {String(index + 1).padStart(2, "0")} —
          </p>
          <h3
            className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {unitType || "Unit"}
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-black/45">
            Unit {unitNumber || "N/A"}
          </p>
        </div>
        <span className="inline-flex items-center border-2 border-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black">
          Vacant
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px border border-stone-200 bg-stone-200">
        <DetailRow icon={Layers3} label="Block" value={blockName || "Main"} />
        <DetailRow icon={Bed} label="Type" value={unitType || "—"} />
        <DetailRow icon={Home} label="Floor" value={unit.floor ?? "Ground"} />
        <DetailRow
          icon={Building2}
          label="Property Vacancies"
          value={unit.vacant_units_in_property || 1}
        />
      </div>
    </article>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-black/40">
        <Icon className="h-3 w-3" strokeWidth={1.8} />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-bold text-black">{value}</p>
    </div>
  );
}
