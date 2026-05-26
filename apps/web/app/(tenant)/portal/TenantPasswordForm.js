"use client";

import { z } from "zod";
import {
  AppForm,
  PasswordField,
  SubmitButton,
} from "@/app/_components/forms";
import { passwordSchema } from "@/app/_lib/password-policy";


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
