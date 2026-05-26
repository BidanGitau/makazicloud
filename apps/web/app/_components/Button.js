"use client";

import React from "react";


const baseClasses =
  "inline-flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  secondary:
    "border border-stone-300 bg-white text-black/65 hover:bg-stone-50",
  ghost:
    "border border-blue-700 bg-white text-blue-700 hover:bg-blue-50",
  success:
    "bg-green-700 text-white hover:bg-green-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
  link:
    "px-0 py-0 text-blue-700 hover:text-blue-800 tracking-[0.18em]",
};

export default function Button({
  as: Component = "button",
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const classes = `${baseClasses} ${variants[variant] || variants.primary} ${className}`.trim();

  return <Component type={type} className={classes} {...props} />;
}
