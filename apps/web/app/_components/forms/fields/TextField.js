"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "antd";
import FieldWrapper from "./_FieldWrapper";

/**
 * TextField — text / email / url / tel input.
 *
 * Props:
 *   name      RHF field name (required)
 *   label     above-input label
 *   type      "text" | "email" | "url" | "tel" | "password" (default "text")
 *   placeholder, helper, required, disabled
 *   icon      lucide icon component for prefix
 *   suffix    string or node rendered as input suffix
 *   className wrapper class
 */
export default function TextField({
  name,
  label,
  type = "text",
  placeholder,
  helper,
  required = false,
  disabled = false,
  icon: Icon,
  suffix,
  className = "",
  ...rest
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FieldWrapper
          label={label}
          name={name}
          error={error?.message}
          helper={helper}
          required={required}
          className={className}
        >
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            status={error ? "error" : undefined}
            prefix={
              Icon ? (
                <Icon className="h-4 w-4 text-black/40" strokeWidth={1.8} />
              ) : undefined
            }
            suffix={suffix}
            size="large"
            {...rest}
          />
        </FieldWrapper>
      )}
    />
  );
}
