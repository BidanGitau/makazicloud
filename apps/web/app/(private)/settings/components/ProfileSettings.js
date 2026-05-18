"use client";

import { z } from "zod";
import { useAuth } from "@/app/_context/AuthContext";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  TextField,
  SubmitButton,
} from "@/app/_components/forms";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();

  const defaultValues = {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  };

  const handleSubmit = async (values) => {
    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });
      showToast.success("Profile updated successfully!");
    } catch (err) {
      showToast.error(err?.message || "Failed to update profile");
      throw err;
    }
  };

  return (
    <AppForm
      schema={profileSchema}
      defaultValues={defaultValues}
      values={defaultValues}
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <header>
        <p className="section-label">— Account —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Profile Settings
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Manage your personal information and contact details.
        </p>
      </header>

      <AvatarCard user={user} />

      <FieldSection title="Personal" columns={2}>
        <TextField name="firstName" label="First name" placeholder="Enter first name" />
        <TextField name="lastName" label="Last name" placeholder="Enter last name" />
        <ReadOnlyEmail email={user?.email} />
        <TextField name="phone" label="Phone number" placeholder="+254 700 000 000" />
      </FieldSection>

      <div className="flex justify-end pt-2">
        <SubmitButton fullWidth={false} icon={null}>
          Save Changes
        </SubmitButton>
      </div>
    </AppForm>
  );
}

function AvatarCard({ user }) {
  const initial =
    user?.firstName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";

  return (
    <div className="flex flex-col items-start gap-4 border border-stone-200 bg-stone-50 p-5 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="flex h-20 w-20 items-center justify-center bg-blue-700 text-2xl font-black text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h3
          className="text-lg font-black uppercase tracking-tight text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your name"}
        </h3>
        <p className="break-all text-sm text-black/55">{user?.email}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
          Member since {memberSince}
        </p>
      </div>
    </div>
  );
}

function ReadOnlyEmail({ email }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
        Email address
      </label>
      <input
        type="email"
        value={email || ""}
        disabled
        className="mt-2 w-full border border-stone-300 bg-stone-100 px-3 py-2 font-mono text-sm tabular-nums text-black/60"
      />
      <p className="mt-1 text-xs text-black/45">
        Contact support to change your email address.
      </p>
    </div>
  );
}
