"use client";

import { z } from "zod";
import {
  AppForm,
  PasswordField,
  SubmitButton,
} from "@/app/_components/forms";
import { passwordSchema } from "@/app/_lib/password-policy";

// Single password-setting form for tenants.
//
// Used in two flows:
//   1. /accept-tenant-invite       — `mode="set"` (no current password)
//   2. portal "Update Password"    — `mode="change"` (requires current)
//
// One component → one set of fields, one validation flow, one place to
// update if the policy or styling changes. The caller owns submit:
// `onSubmit(values)` receives `{ newPassword, currentPassword? }` and
// can throw to surface a server error to the form's root.
//
// Layout note: vertical stack of full-width PasswordFields, button at
// the end. Wrap in a centered card with the editorial header on the
// caller's side; this component is layout-agnostic so it drops into
// both the auth shell and the portal sidebar without restyling.

const setSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export default function TenantPasswordForm({
  mode = "set",
  onSubmit,
  submitLabel,
  submitVariant = "primary",
  resetOnSuccess = false,
  className = "",
}) {
  const isChange = mode === "change";
  const schema = isChange ? changeSchema : setSchema;
  const defaultValues = isChange
    ? { currentPassword: "", newPassword: "", confirmPassword: "" }
    : { newPassword: "", confirmPassword: "" };

  return (
    <AppForm
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      resetOnSuccess={resetOnSuccess}
      className={`space-y-4 ${className}`}
    >
      {isChange && (
        <PasswordField
          name="currentPassword"
          label="Current Password"
          required
        />
      )}
      <PasswordField
        name="newPassword"
        label={isChange ? "New Password" : "Password"}
        placeholder="Choose a strong password"
        required
      />
      <PasswordField
        name="confirmPassword"
        label={isChange ? "Confirm New Password" : "Confirm password"}
        placeholder="Re-enter your password"
        required
      />
      <SubmitButton variant={submitVariant} fullWidth>
        {submitLabel || (isChange ? "Update Password" : "Set Password")}
      </SubmitButton>
    </AppForm>
  );
}
