"use client";

import { apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";
import { Section } from "./portal-ui";
import TenantPasswordForm from "./TenantPasswordForm";

export default function PasswordUpdateForm() {
  const handleSubmit = async (values) => {
    try {
      await apiFetch("/auth/password", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });
      showToast.success("Password updated.");
    } catch (error) {
      showToast.error(error.message || "Failed to update password");
      throw error;
    }
  };

  return (
    <Section title="Update Password">
      <TenantPasswordForm
        mode="change"
        onSubmit={handleSubmit}
        submitVariant="ghost"
        submitLabel="Update Password"
        resetOnSuccess
      />
    </Section>
  );
}
