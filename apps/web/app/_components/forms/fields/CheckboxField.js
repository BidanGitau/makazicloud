"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "antd";

/**
 * CheckboxField — boolean checkbox + inline label.
 *
 * Props:
 *   name, label, description, disabled, required, className
 */
export default function CheckboxField({
  name,
  label,
  description,
  disabled = false,
  required = false,
  className = "",
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div
          className={`border border-stone-200 bg-stone-50 p-4 ${error ? "border-red-500" : ""} ${className}`}
        >
          <label
            htmlFor={name}
            className="flex cursor-pointer items-start gap-3"
          >
            <Checkbox
              id={name}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              disabled={disabled}
            />
            <div className="min-w-0 flex-1">
              <span className="text-[12px] leading-relaxed text-black/75">
                {label}
                {required && <span className="ml-0.5 text-blue-700">*</span>}
              </span>
              {description && (
                <p className="mt-1 text-[11px] text-black/55">{description}</p>
              )}
              {error && (
                <p className="mt-1 text-[11px] font-medium text-red-600">
                  {error.message}
                </p>
              )}
            </div>
          </label>
        </div>
      )}
    />
  );
}
