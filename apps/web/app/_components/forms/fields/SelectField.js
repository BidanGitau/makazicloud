"use client";

import { Controller, useFormContext } from "react-hook-form";
import FieldWrapper from "./_FieldWrapper";


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
  const isMultiple = mode === "multiple" || mode === "tags";

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
          <select
            id={name}
            name={field.name}
            ref={field.ref}
            disabled={disabled}
            multiple={isMultiple}
            value={field.value ?? (isMultiple ? [] : "")}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = isMultiple
                ? Array.from(event.target.selectedOptions, (option) => option.value)
                : event.target.value;
              const option = isMultiple
                ? normalizedOptions.filter((item) => value.includes(String(item.value)))
                : normalizedOptions.find((item) => String(item.value) === String(value));
              field.onChange(value);
              onValueChange?.(value, option);
            }}
            className={`w-full border bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-black/45 ${
              error ? "border-red-500" : "border-stone-300"
            } ${isMultiple ? "min-h-28" : "h-11"}`}
          >
            {allowClear && !isMultiple && (
              <option value="">{placeholder || "Select..."}</option>
            )}
            {!allowClear && placeholder && !isMultiple && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {loading ? (
              <option value="" disabled>
                Loading...
              </option>
            ) : (
              normalizedOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            )}
          </select>
        </FieldWrapper>
      )}
    />
  );
}
