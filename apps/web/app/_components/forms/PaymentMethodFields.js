"use client";

import { z } from "zod";
import { useFormContext, useWatch } from "react-hook-form";
import SelectField from "./fields/SelectField";
import TextField from "./fields/TextField";

export const paymentMethodOptions = [
  { value: "account", label: "Account number" },
  { value: "phone", label: "Phone number" },
  { value: "mpesa_paybill", label: "M-Pesa Paybill" },
  { value: "mpesa_till", label: "M-Pesa Till" },
];

export const paymentMethodSchema = z.object({
  type: z.string().optional(),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  phone_number: z.string().optional(),
  paybill: z.string().optional(),
  till_number: z.string().optional(),
  instructions: z.string().optional(),
});

export function emptyPaymentMethod() {
  return {
    type: "",
    account_name: "",
    account_number: "",
    phone_number: "",
    paybill: "",
    till_number: "",
    instructions: "",
  };
}

export function normalizePaymentMethod(method = {}) {
  return {
    ...emptyPaymentMethod(),
    type: method.type || "",
    account_name: method.account_name || "",
    account_number: method.account_number || "",
    phone_number: method.phone_number || "",
    paybill: method.paybill || "",
    till_number: method.till_number || "",
    instructions: method.instructions || "",
  };
}

export function compactPaymentMethod(method = {}) {
  const type = method.type || "";
  if (!type) return null;
  return {
    type,
    account_name: method.account_name || null,
    account_number: method.account_number || null,
    phone_number: method.phone_number || null,
    paybill: method.paybill || null,
    till_number: method.till_number || null,
    instructions: method.instructions || null,
  };
}

export function formatPaymentMethod(method = {}) {
  if (!method?.type) return "";
  const withNote = (value) =>
    [value, method.instructions ? `Note: ${method.instructions}` : ""]
      .filter(Boolean)
      .join(" | ");

  if (method.type === "account") {
    return withNote(
      [
        "Account",
        method.account_name ? `Name: ${method.account_name}` : "",
        method.account_number ? `No: ${method.account_number}` : "",
      ].filter(Boolean).join(" | "),
    );
  }

  if (method.type === "phone") {
    return withNote(
      method.phone_number ? `Phone: ${method.phone_number}` : "Phone payment",
    );
  }

  if (method.type === "mpesa_paybill") {
    return withNote(
      [
        "M-Pesa Paybill",
        method.paybill ? `PayBill: ${method.paybill}` : "",
        method.account_number ? `Account: ${method.account_number}` : "",
      ].filter(Boolean).join(" | "),
    );
  }

  if (method.type === "mpesa_till") {
    return withNote(
      method.till_number
        ? `M-Pesa Till: ${method.till_number}`
        : "M-Pesa Till",
    );
  }

  return "";
}

export default function PaymentMethodFields({
  baseName,
  compact = false,
  label = "Payment method",
  placeholder = "Select method",
  showNote = !compact,
}) {
  const { setValue } = useFormContext();
  const type = useWatch({ name: `${baseName}.type` }) || "";

  const resetMethod = (value) => {
    setValue(`${baseName}.type`, value || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    [
      "account_name",
      "account_number",
      "phone_number",
      "paybill",
      "till_number",
      "instructions",
    ].forEach((field) => {
      setValue(`${baseName}.${field}`, "", { shouldDirty: true });
    });
  };

  return (
    <div className={`grid grid-cols-1 gap-3 ${compact ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      <SelectField
        name={`${baseName}.type`}
        label={compact ? null : label}
        placeholder={placeholder}
        options={paymentMethodOptions}
        allowClear
        onValueChange={resetMethod}
        className={compact ? "md:col-span-1" : ""}
      />

      {type === "account" && (
        <>
          <TextField
            name={`${baseName}.account_name`}
            label={compact ? null : "Account name"}
            placeholder="Account name"
          />
          <TextField
            name={`${baseName}.account_number`}
            label={compact ? null : "Account number"}
            placeholder="Account number"
            required={!compact}
          />
        </>
      )}

      {type === "phone" && (
        <TextField
          name={`${baseName}.phone_number`}
          label={compact ? null : "Phone number"}
          placeholder="07..."
          required={!compact}
          className={compact ? "md:col-span-2" : ""}
        />
      )}

      {type === "mpesa_paybill" && (
        <>
          <TextField
            name={`${baseName}.paybill`}
            label={compact ? null : "Paybill"}
            placeholder="Paybill"
            required={!compact}
          />
          <TextField
            name={`${baseName}.account_number`}
            label={compact ? null : "Account number"}
            placeholder="Account number"
          />
        </>
      )}

      {type === "mpesa_till" && (
        <TextField
          name={`${baseName}.till_number`}
          label={compact ? null : "Till number"}
          placeholder="Till number"
          required={!compact}
          className={compact ? "md:col-span-2" : ""}
        />
      )}

      {type && showNote && (
        <TextField
          name={`${baseName}.instructions`}
          label="Payment note"
          placeholder="Optional note"
          className="md:col-span-2"
        />
      )}
    </div>
  );
}
