"use client";


export default function FieldWrapper({
  label,
  name,
  error,
  helper,
  required,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55"
        >
          {label}
          {required && <span className="ml-0.5 text-blue-700">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-[10px] font-medium text-black/40">{helper}</p>
      ) : null}
    </div>
  );
}
