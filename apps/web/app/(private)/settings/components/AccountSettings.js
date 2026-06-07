"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Building2,
  Globe,
  ImageIcon,
  Lock,
  Shield,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/app/_context/AuthContext";
import { apiFetch } from "@/app/_lib/api/client";
import {
  DEFAULT_BRANDING,
  fetchOrganizationBranding,
  saveOrganizationBranding,
} from "@/app/_lib/branding";
import { showToast } from "@/app/_components/CustomToast";
import {
  AppForm,
  FieldSection,
  PasswordField,
  SubmitButton,
  useWatch,
} from "@/app/_components/forms";
import DeleteAccountModal from "./DeleteAccountModal";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[a-z]/, "One lowercase letter")
      .regex(/[0-9]/, "One number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const emptyPasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AccountSettings() {
  const { user, logout, hasPermission } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [publicListingsEnabled, setPublicListingsEnabled] = useState(false);
  const [publicListingsSaving, setPublicListingsSaving] = useState(false);
  const canManageSettings = hasPermission?.("settings:manage") ?? true;

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationBranding()
      .then((next) => {
        if (!cancelled) setBranding(next);
      })
      .catch((error) => {
        console.error("Failed to load organization branding:", error);
      });
    apiFetch("/organization/public-listings")
      .then((next) => {
        if (!cancelled) setPublicListingsEnabled(Boolean(next?.enabled));
      })
      .catch((error) => {
        console.error("Failed to load public-listings setting:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTogglePublicListings = async () => {
    const next = !publicListingsEnabled;
    setPublicListingsSaving(true);
    setPublicListingsEnabled(next);
    try {
      const result = await apiFetch("/organization/public-listings", {
        method: "PATCH",
        body: { enabled: next },
      });
      setPublicListingsEnabled(Boolean(result?.enabled));
      showToast.success(
        next ? "Public listings enabled." : "Public listings disabled.",
      );
    } catch (error) {
      setPublicListingsEnabled(!next);
      showToast.error(error?.message || "Failed to update public listings.");
    } finally {
      setPublicListingsSaving(false);
    }
  };

  const handleLogoChange = (event) => {
    if (!canManageSettings) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showToast.error("Use a PNG, JPG, or WEBP logo.");
      return;
    }
    if (file.size > 500 * 1024) {
      showToast.error("Logo must be under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBranding((current) => ({
        ...current,
        logoDataUrl: String(reader.result || ""),
        hasCustomLogo: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    if (!canManageSettings) {
      showToast.error("You do not have permission to update branding.");
      return;
    }
    setBrandingSaving(true);
    try {
      const next = await saveOrganizationBranding({
        name: branding.name,
        institutionName: branding.institutionName,
        logoDataUrl: branding.logoDataUrl,
      });
      setBranding(next);
      showToast.success("Branding updated.");
    } catch (error) {
      showToast.error(error?.message || "Failed to save branding");
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await apiFetch("/auth/password", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });

      showToast.success("Password changed successfully!");
    } catch (err) {
      showToast.error(err?.message || "Failed to change password");
      throw err;
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      showToast.error('Please type "DELETE" to confirm account deletion');
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/data/users/${user.id}`, { method: "DELETE" });
      await logout();
    } catch (err) {
      showToast.error(err?.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="section-label">— Account —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Account Settings
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Manage your account security and preferences.
        </p>
      </header>

      <section className="border border-stone-200 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Building2 className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
          <div>
            <p className="section-label">— Management Branding —</p>
            <p className="mt-1 text-sm text-black/55">
              This name and logo appear on reports, statements, and invoices.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-start gap-3">
            <div className="flex h-28 w-40 items-center justify-center border border-stone-200 bg-stone-50">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt="Organization logo"
                  className="max-h-24 max-w-36 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-black/35">
                  <ImageIcon className="h-8 w-8" strokeWidth={1.6} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                    MakaziCloud
                  </span>
                </div>
              )}
            </div>
            <label className="cursor-pointer border border-stone-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/65 transition-colors hover:bg-stone-50">
              Upload logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                disabled={!canManageSettings}
                className="sr-only"
              />
            </label>
            {canManageSettings && branding.logoDataUrl && (
              <button
                type="button"
                onClick={() =>
                  setBranding((current) => ({
                    ...current,
                    logoDataUrl: null,
                    hasCustomLogo: false,
                  }))
                }
                className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600 hover:text-red-700"
              >
                Remove logo
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
                Organization name
              </span>
              <input
                value={branding.name}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={!canManageSettings}
                className="mt-2 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
                Institution / trading name
              </span>
              <input
                value={branding.institutionName}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    institutionName: event.target.value,
                    displayName: event.target.value || current.name,
                  }))
                }
                disabled={!canManageSettings}
                placeholder="Displayed on PDFs"
                className="mt-2 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </label>
            <div className="sm:col-span-2">
              <div className="border border-stone-200 bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
                  Preview
                </p>
                <p className="mt-2 text-sm font-black text-black">
                  {branding.institutionName ||
                    branding.name ||
                    "MakaziCloud Property Management"}
                </p>
                <p className="mt-1 text-xs text-black/50">
                  If no logo is uploaded, reports use the default MakaziCloud
                  mark.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={brandingSaving || !canManageSettings}
                  className="bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
                >
                  {brandingSaving ? "Saving..." : "Save Branding"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-stone-200 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Globe className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
          <div>
            <p className="section-label">— Public Property Listings —</p>
            <p className="mt-1 text-sm text-black/55">
              When enabled, properties that currently have vacant units appear
              on the public makazicloud.com marketing feed. Fully-occupied
              buildings stay hidden. Off by default — turn this on only if you
              want anonymous visitors to browse your available listings.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
          <div>
            <p className="text-sm font-bold text-black">
              {publicListingsEnabled
                ? "Listings are public"
                : "Listings are private"}
            </p>
            <p className="mt-1 text-xs text-black/55">
              {publicListingsEnabled
                ? "Properties with vacant units are visible to anyone — name, address, unit counts, and rent amounts. Fully-occupied properties stay private."
                : "Your property data is only visible to your team."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePublicListings}
            disabled={publicListingsSaving || !canManageSettings}
            aria-pressed={publicListingsEnabled}
            aria-label="Toggle public listings"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              publicListingsEnabled
                ? "border-blue-700 bg-blue-700"
                : "border-stone-300 bg-stone-100"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform bg-white transition-transform ${
                publicListingsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="border border-stone-200 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Lock className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
          <div>
            <p className="section-label">— Change Password —</p>
            <p className="mt-1 text-sm text-black/55">
              Update your password to keep your account secure.
            </p>
          </div>
        </div>

        <AppForm
          schema={passwordSchema}
          defaultValues={emptyPasswordValues}
          onSubmit={handleChangePassword}
          resetOnSuccess
          className="space-y-7"
        >
          <FieldSection title="Credentials" columns={1}>
            <PasswordField
              name="currentPassword"
              label="Current password"
              placeholder="Enter current password"
              required
            />
            <PasswordField
              name="newPassword"
              label="New password"
              placeholder="Enter new password"
              required
            />
            <StrengthMeter />
            <PasswordField
              name="confirmPassword"
              label="Confirm new password"
              placeholder="Re-enter new password"
              required
            />
          </FieldSection>

          <div className="flex justify-end pt-2">
            <SubmitButton fullWidth={false} icon={null}>
              Change Password
            </SubmitButton>
          </div>
        </AppForm>
      </section>

      <section className="border border-stone-200 p-5 sm:p-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Shield className="h-4 w-4 text-blue-700" strokeWidth={1.8} />
          <div className="flex-1">
            <p className="section-label">— Two-Factor Authentication —</p>
            <p className="mt-1 text-sm text-black/55">
              Add an extra layer of security to your account.
            </p>
          </div>
          <span className="self-start border border-stone-300 bg-stone-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
            Coming Soon
          </span>
        </div>
        <p className="text-sm text-black/65">
          Two-factor authentication adds an additional layer of security by
          requiring a code from your phone in addition to your password.
        </p>
      </section>

      <section className="border border-red-200 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={1.8} />
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-600"
              style={{ fontFamily: "var(--font-display)" }}
            >
              — Danger Zone —
            </p>
            <p className="mt-1 text-sm text-red-700/80">
              Irreversible and destructive actions.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className="text-sm font-black uppercase tracking-tight text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Delete account
            </p>
            <p className="text-sm text-black/65">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex w-full items-center justify-center gap-2 bg-red-600 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-red-700 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            Delete Account
          </button>
        </div>
      </section>

      {showDeleteConfirm && (
        <DeleteAccountModal
          deleting={deleting}
          deleteConfirmText={deleteConfirmText}
          setDeleteConfirmText={setDeleteConfirmText}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
          }}
          onDelete={handleDeleteAccount}
        />
      )}
    </div>
  );
}

function StrengthMeter() {
  const password = useWatch({ name: "newPassword" }) || "";
  if (!password) return null;

  const rules = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "One uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "One lowercase letter", pass: /[a-z]/.test(password) },
    { label: "One number", pass: /[0-9]/.test(password) },
    { label: "One special character", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((r) => r.pass).length;
  const tone =
    score <= 2
      ? { color: "bg-red-500", text: "Weak", accent: "text-red-600" }
      : score <= 3
        ? { color: "bg-yellow-500", text: "Medium", accent: "text-yellow-600" }
        : { color: "bg-green-500", text: "Strong", accent: "text-green-600" };

  return (
    <div className="-mt-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden bg-stone-200">
          <div
            className={`h-full ${tone.color} transition-all duration-300`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.22em] ${tone.accent}`}
        >
          {tone.text}
        </span>
      </div>
      <ul className="space-y-1 text-xs text-black/55">
        {rules.slice(0, 4).map((r) => (
          <li key={r.label} className={r.pass ? "text-green-600" : ""}>
            • {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
