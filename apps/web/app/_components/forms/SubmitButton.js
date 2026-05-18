"use client";

import { useFormContext } from "react-hook-form";
import { ArrowRight } from "lucide-react";

/**
 * SubmitButton — auto-binds to AppForm's submit state.
 *
 * Props:
 *   children    button label (default "Save")
 *   icon        trailing icon component (default ArrowRight)
 *   variant     "primary" | "ghost"  (default "primary")
 *   fullWidth   bool — fill container width
 *   disabled    extra disabled condition (e.g. !canSubmit)
 */
export default function SubmitButton({
  children = "Save",
  icon: Icon = ArrowRight,
  variant = "primary",
  fullWidth = true,
  disabled = false,
  className = "",
}) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  const base =
    "group inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-50";

  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    ghost:
      "border border-blue-700 text-blue-700 hover:bg-blue-50",
  };

  return (
    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {isSubmitting ? (
        <span
          className={`h-4 w-4 animate-spin rounded-full border-2 ${variant === "primary" ? "border-white" : "border-blue-700"} border-t-transparent`}
        />
      ) : (
        <>
          {children}
          {Icon && (
            <Icon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          )}
        </>
      )}
    </button>
  );
}
