"use client";

import { z } from "zod";
import { Mail, X } from "lucide-react";
import {
  AppForm,
  FieldSection,
  TextField,
  SelectField,
  SubmitButton,
} from "@/app/_components/forms";

const inviteSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  fullName: z.string().optional(),
  roleId: z.string().min(1, "Choose a role"),
});

const emptyInvite = { email: "", fullName: "", roleId: "" };

export default function InviteModal({ roles = [], onClose, onSubmit }) {
  const roleOptions = roles.map((r) => ({
    value: String(r.id),
    label: r.name,
  }));

  const handleSubmit = async (values) => {
    await onSubmit({
      email: values.email,
      fullName: values.fullName,
      roleId: values.roleId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-stone-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 p-4 sm:p-6">
          <div>
            <p className="section-label">— Team —</p>
            <h3
              className="mt-1 text-xl font-black uppercase tracking-tight text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Invite Member
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-black/55 transition-colors hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <AppForm
            schema={inviteSchema}
            defaultValues={emptyInvite}
            onSubmit={handleSubmit}
            className="space-y-7"
          >
            <FieldSection title="Invitation" columns={1}>
              <TextField
                name="email"
                label="Email address"
                type="email"
                placeholder="colleague@example.com"
                required
              />
              <TextField
                name="fullName"
                label="Full name"
                placeholder="John Doe"
              />
              <SelectField
                name="roleId"
                label="Role"
                placeholder="Select a role"
                options={roleOptions}
                required
              />
            </FieldSection>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-stone-50 sm:w-auto"
              >
                Cancel
              </button>
              <SubmitButton fullWidth={false} icon={Mail}>
                Send Invitation
              </SubmitButton>
            </div>
          </AppForm>
        </div>
      </div>
    </div>
  );
}
