"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "antd";
import { Lock, Eye, EyeOff } from "lucide-react";
import FieldWrapper from "./_FieldWrapper";


export default function PasswordField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  showToggle = true,
  autoComplete,
  className = "",
}) {
  const { control } = useFormContext();
  const [show, setShow] = useState(false);
  const resolvedAutoComplete =
    autoComplete ||
    (name === "currentPassword" || name === "password"
      ? "current-password"
      : "new-password");

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
            type={show ? "text" : "password"}
            placeholder={placeholder || "••••••••"}
            autoComplete={resolvedAutoComplete}
            disabled={disabled}
            status={error ? "error" : undefined}
            prefix={<Lock className="h-4 w-4 text-black/40" strokeWidth={1.8} />}
            suffix={
              showToggle ? (
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="p-1 text-black/40 hover:text-black"
                  aria-label={show ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.8} />
                  )}
                </button>
              ) : null
            }
            size="large"
          />
        </FieldWrapper>
      )}
    />
  );
}
