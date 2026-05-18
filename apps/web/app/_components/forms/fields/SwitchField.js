"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Switch } from "antd";

/**
 * SwitchField — boolean toggle with label on the right.
 *
 * Props:
 *   name, label, description, helper, disabled, className
 */
export default function SwitchField({
  name,
  label,
  description,
  helper,
  disabled = false,
  className = "",
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={`flex items-start gap-3 ${className}`}>
          <Switch
            checked={!!field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
          <div className="flex-1">
            {label && (
              <label
                htmlFor={name}
                className="block text-[12px] font-bold text-black"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-black/55">
                {description}
              </p>
            )}
            {error ? (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                {error.message}
              </p>
            ) : helper ? (
              <p className="mt-1 text-[10px] font-medium text-black/40">
                {helper}
              </p>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}
