"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Building2,
} from "lucide-react";
import { useRouter, useSearchParams } from "@/app/_hooks/navigation";
import { apiFetch, ApiError } from "@/app/_lib/api/client";
import { fetchCurrentUser } from "@/app/_lib/api/auth";
import {
  AppForm,
  TextField,
  PasswordField,
  SubmitButton,
} from "@/app/_components/forms";

const acceptSchema = z
  .object({
    fullName: z.string().optional(),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[a-z]/, "One lowercase letter")
      .regex(/[0-9]/, "One number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading");
  const [invitation, setInvitation] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("This invitation link is missing a token.");
      return;
    }
    apiFetch(`/public/invitations/${token}`)
      .then((data) => {
        setInvitation(data);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(
          err instanceof ApiError
            ? err.body?.message || err.message
            : "Couldn't load this invitation.",
        );
      });
  }, [token]);

  const handleSubmit = async (values) => {
    try {
      await apiFetch(`/public/invitations/${token}/accept`, {
        method: "POST",
        body: {
          password: values.password,
          fullName: values.fullName || invitation?.fullName || undefined,
        },
      });

      await fetchCurrentUser();
      setStatus("done");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.body?.message || err.message
          : "Failed to accept invitation.",
      );
      throw err;
    }
  };

  const organizationName = invitation?.organization?.name || "MakaziCloud";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-stone-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-[520px] border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="text-center">
          <p className="section-label">— Invitation —</p>
          <h2
            className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {status === "done" ? "Welcome aboard." : "Set up your account."}
          </h2>
        </div>

        {status === "loading" && (
          <div className="mt-10 flex items-center justify-center gap-3 text-black/55">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
            <p className="text-sm">Checking your invitation…</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4">
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600"
              strokeWidth={1.8}
            />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-red-700">
                Couldn't open invitation
              </p>
              <p className="mt-1 text-sm text-black/65">{errorMsg}</p>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="mt-8 flex items-start gap-3 border-l-2 border-blue-700 bg-blue-50 p-4">
            <CheckCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
              strokeWidth={1.8}
            />
            <p className="text-sm text-black/75">
              You're in. Redirecting to your dashboard…
            </p>
          </div>
        )}

        {status === "ready" && invitation && (
          <>
            <div className="mt-6 border border-stone-200 bg-stone-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <Building2
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                  strokeWidth={1.8}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
                    Organization
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-black">
                    {organizationName}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3 border-t border-stone-200 pt-4">
                <Mail
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                  strokeWidth={1.8}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
                    Invited email
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-black">
                    {invitation.email}
                  </p>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-relaxed text-black/55">
              Pick a password to finish setup and access your MakaziCloud workspace.
            </p>

            {errorMsg && (
              <div className="mt-6 flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600"
                  strokeWidth={1.8}
                />
                <p className="text-sm text-black/75">{errorMsg}</p>
              </div>
            )}

            <div className="mt-7">
              <AppForm
                schema={acceptSchema}
                defaultValues={{
                  fullName: invitation.fullName || "",
                  password: "",
                  confirmPassword: "",
                }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  value={invitation.email}
                  readOnly
                  hidden
                />
                <TextField
                  name="fullName"
                  label="Full name"
                  placeholder="Your name"
                />
                <PasswordField
                  name="password"
                  label="Password"
                  placeholder="Choose a strong password"
                  autoComplete="new-password"
                  required
                />
                <PasswordField
                  name="confirmPassword"
                  label="Confirm password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
                <SubmitButton fullWidth>Accept Invitation</SubmitButton>
              </AppForm>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
