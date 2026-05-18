"use client";

import { Controller, useFormContext } from "react-hook-form";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import FieldWrapper from "./_FieldWrapper";

/**
 * DateField — AntD DatePicker bound to RHF.
 *
 * Stores ISO string in form state (YYYY-MM-DD) but shows a dayjs date in
 * the picker so it round-trips with backend payloads.
 *
 * Props:
 *   name, label, placeholder, helper, required, disabled, className
 *   picker     "date" | "month" | "year"  (default "date")
 *   format     display format (default "DD MMM YYYY")
 *   minDate, maxDate  ISO strings
 */
export default function DateField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  picker = "date",
  format = "DD MMM YYYY",
  minDate,
  maxDate,
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
          <DatePicker
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            picker={picker}
            format={format}
            status={error ? "error" : undefined}
            size="large"
            style={{ width: "100%" }}
            value={field.value ? dayjs(field.value) : null}
            onChange={(date) =>
              field.onChange(date ? date.format("YYYY-MM-DD") : null)
            }
            onBlur={field.onBlur}
            disabledDate={(current) => {
              if (!current) return false;
              if (minDate && current.isBefore(dayjs(minDate), "day")) return true;
              if (maxDate && current.isAfter(dayjs(maxDate), "day")) return true;
              return false;
            }}
          />
        </FieldWrapper>
      )}
    />
  );
}
