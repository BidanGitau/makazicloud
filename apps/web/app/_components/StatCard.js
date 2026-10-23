"use client";

const SIZES = {
  md: {
    box: "px-4 py-3",
    label: "text-[10px] tracking-[0.22em] text-black/55",
    value: "mt-1 text-lg font-black",
    icon: "h-4 w-4",
  },
  sm: {
    box: "px-3 py-2",
    label: "text-[9px] tracking-[0.16em] text-black/50",
    value: "mt-0.5 text-sm font-black leading-tight",
    icon: "h-3.5 w-3.5",
  },
};

/** Label + figure tile used in the summary strips across dashboard pages. */
export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-black",
  size = "md",
}) {
  const styles = SIZES[size] || SIZES.md;
  return (
    <div className={`bg-white ${styles.box}`}>
      <div className="flex items-center justify-between">
        <p className={`font-bold uppercase ${styles.label}`}>{label}</p>
        {Icon && <Icon className={`${styles.icon} ${accent}`} strokeWidth={1.8} />}
      </div>
      <p
        className={`tabular-nums ${styles.value} ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
