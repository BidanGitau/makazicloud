"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "antd";
import FieldWrapper from "./_FieldWrapper";

/**
 * TextAreaField — multi-line text input.
 *
 * Props:
 *   name, label, placeholder, helper, required, disabled, className
 *   rows         default 4
 *   maxLength    optional character cap; shows counter when set
 *   autoSize     bool | { minRows, maxRows }
 */
export default function TextAreaField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  autoSize,
  className = "",
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
          <Input.TextArea
            {...field}
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            showCount={Boolean(maxLength)}
            autoSize={autoSize}
            status={error ? "error" : undefined}
          />
        </FieldWrapper>
      )}
    />
  );
}
