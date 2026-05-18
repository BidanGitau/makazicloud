"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Select } from "antd";
import FieldWrapper from "./_FieldWrapper";

/**
 * SelectField — AntD Select bound to RHF.
 *
 * Props:
 *   name, label, placeholder, helper, required, disabled, className
 *   options   [{ value, label, disabled? }]  or array of strings
 *   mode      undefined | "multiple" | "tags"
 *   allowClear
 *   showSearch — enables typeahead filtering
 *   loading
 *   onValueChange  (value) => void
 *     Fires ONLY on user interaction (after RHF's internal onChange).
 *     Use this to drive cascades (e.g. clearing dependent fields when a
 *     parent select changes) — do NOT do it in a useEffect on the watched
 *     value, that re-fires on programmatic resets too.
 */
export default function SelectField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  options = [],
  mode,
  allowClear = true,
  showSearch = false,
  loading = false,
  className = "",
  onValueChange,
}) {
  const { control } = useFormContext();

  const normalizedOptions = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );

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
          <Select
            {...field}
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            options={normalizedOptions}
            mode={mode}
            allowClear={allowClear}
            showSearch={showSearch}
            optionFilterProp={showSearch ? "label" : undefined}
            loading={loading}
            status={error ? "error" : undefined}
            size="large"
            style={{ width: "100%" }}
            value={field.value ?? undefined}
            onChange={(value, option) => {
              field.onChange(value);
              onValueChange?.(value, option);
            }}
          />
        </FieldWrapper>
      )}
    />
  );
}
