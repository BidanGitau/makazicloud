"use client";

/**
 * FieldSection — labelled section for grouping related fields.
 * Renders the eyebrow + section title used across the editorial design.
 *
 * Props:
 *   title       short uppercase label (e.g. "Personal", "Contact")
 *   description optional one-line subtitle
 *   columns     1 | 2 | 3 — grid columns (default 1)
 *   children    field components
 *   className   extra classes
 */
export default function FieldSection({
  title,
  description,
  columns = 1,
  children,
  className = "",
}) {
  const colClass =
    columns === 3
      ? "grid grid-cols-1 gap-4 md:grid-cols-3"
      : columns === 2
        ? "grid grid-cols-1 gap-4 md:grid-cols-2"
        : "space-y-4";

  return (
    <section className={`border-t border-stone-200 pt-6 ${className}`}>
      {title && (
        <header className="-mt-9 mb-5 flex items-baseline gap-3">
          <p className="bg-white pr-3 text-[10px] mt-5 font-bold uppercase tracking-[0.22em] text-black/45">
            — {title} —
          </p>
          {description && (
            <p className="bg-white text-[11px] text-black/45">{description}</p>
          )}
        </header>
      )}
      <div className={colClass}>{children}</div>
    </section>
  );
}
