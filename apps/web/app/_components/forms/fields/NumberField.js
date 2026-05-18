"use client";

import { Controller, useFormContext } from "react-hook-form";
import { InputNumber } from "antd";
import FieldWrapper from "./_FieldWrapper";

/**
 * NumberField — numeric input.
 *
 * Props:
 *   name, label, placeholder, helper, required, disabled, className
 *   min, max, step, precision
 *   prefix  string (e.g. "KSh ")
 *   formatter / parser  optional fns
 */
export default function NumberField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  min,
  max,
  step,
  precision,
  prefix,
  formatter,
  parser,
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
          <InputNumber
            {...field}
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            precision={precision}
            prefix={prefix}
            formatter={formatter}
            parser={parser}
            status={error ? "error" : undefined}
            size="large"
            style={{ width: "100%" }}
          />
        </FieldWrapper>
      )}
    />
  );
}
