"use client";

import { useState, Suspense } from "react";
import { z } from "zod";
import { useFormContext } from "react-hook-form";
import Link from "@/app/_components/AppLink";
import { useRouter, useSearchParams } from "@/app/_hooks/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import {
  AppForm,
  PasswordField,
  SubmitButton,
} from "@/app/_components/forms";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const RULES = [
  { label: "≥ 8 characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Number", test: (p) => /[0-9]/.test(p) },
];

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });


function StrengthMeter() {
  const { watch } = useFormContext();
  const password = watch("password") || "";
  if (!password) return null;
  const passedCount = RULES.filter((r) => r.test(password)).length;
  return (
    <div className="-mt-3 space-y-2">
      <div className="flex h-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`flex-1 ${i <= passedCount ? "bg-blue-700" : "bg-stone-200"}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map((r) => {
          const pass = r.test(password);
          return (
            <li
              key={r.label}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${pass ? "text-blue-700" : "text-black/35"}`}
            >
              <span
                className={`inline-block h-1 w-1 ${pass ? "bg-blue-700" : "bg-black/25"}`}
              />
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResetPasswordContent() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const mode = searchParams.get("mode");
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const isInviteSetup = mode === "invite";
  const title = isInviteSetup ? "Create your password" : "Reset password";
  const subtitle = isInviteSetup
    ? "Set a secure password to activate your account."
    : email
      ? `Choose a new secure password for ${email}.`
      : "Choose a new secure password for your account.";

  const handleReset = async ({ password }) => {
    setErrorMsg("");
    setSuccessMsg("");

    const accessToken = sessionStorage.getItem("pending_access_token");
    const refreshToken = sessionStorage.getItem("pending_refresh_token");

    if (isInviteSetup && (!accessToken || !refreshToken)) {
      setErrorMsg(
        "Your invitation link has expired or was opened in a new tab. Click the link in your email again.",
      );
      throw new Error("Missing tokens");
    }

    if (accessToken && refreshToken) {


      sessionStorage.removeItem("pending_access_token");
      sessionStorage.removeItem("pending_refresh_token");
    }

    if (!isInviteSetup && !token) {
      setErrorMsg(
        "This reset page is missing a valid token. Open the link from your password reset email.",
      );
      throw new Error("Missing reset token");
    }

    try {
      if (!isInviteSetup) {
        await resetPassword({ token, password });
      }
      setSuccessMsg(
        isInviteSetup
          ? "Password set — taking you to your dashboard…"
          : "Password updated — redirecting to sign in…",
      );
      setTimeout(() => {
        router.replace(isInviteSetup ? "/dashboard" : "/login");
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message || "Failed to reset password.");
      throw err;
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full max-w-md">
        <p className="section-label">
          — {isInviteSetup ? "Account Activation" : "Password Reset"} —
        </p>
        <h1
          className="mt-3 text-base font-black uppercase leading-tight tracking-tight text-black sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-black/55">{subtitle}</p>

        {successMsg && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
            <CheckCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
              strokeWidth={1.8}
            />
            <p className="text-[12px] font-bold text-black">{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
              strokeWidth={1.8}
            />
            <p className="text-[12px] font-bold text-black">{errorMsg}</p>
          </div>
        )}

        {!successMsg && (
          <AppForm
            schema={resetSchema}
            defaultValues={{ password: "", confirmPassword: "" }}
            onSubmit={handleReset}
            className="mt-8 space-y-6"
          >
            <PasswordField name="password" label="New Password" required />
            <StrengthMeter />
            <PasswordField
              name="confirmPassword"
              label="Confirm New Password"
              required
            />
            <SubmitButton>
              {isInviteSetup ? "Create Password" : "Reset Password"}
            </SubmitButton>
          </AppForm>
        )}

        <div className="mt-10 border-t border-stone-200 pt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
