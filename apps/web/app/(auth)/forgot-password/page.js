"use client";

import { useState } from "react";
import { z } from "zod";
import Link from "@/app/_components/AppLink";
import { useAuth } from "@/app/_context/AuthContext";
import {
  AppForm,
  TextField,
  SubmitButton,
} from "@/app/_components/forms";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");
  const [emailSent, setEmailSent] = useState("");

  const handleForgot = async ({ email }) => {
    setErrorMsg("");
    try {
      await forgotPassword(email);
      setEmailSent(email);
    } catch (err) {
      setErrorMsg(err.message || "Failed to send reset email.");
      throw err;
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full max-w-md">
        <p className="section-label">— Password Recovery —</p>

        {!emailSent ? (
          <>
            <h1
              className="mt-3  font-black uppercase leading-tight tracking-tight text-black sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Forgot it?<br />
              <span className="text-black/30">We'll send a link.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-black/55">
              Enter the email tied to your account. We'll send a link to set a
              new password.
            </p>

            {errorMsg && (
              <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                  strokeWidth={1.8}
                />
                <p className="text-[12px] font-bold text-black">{errorMsg}</p>
              </div>
            )}

            <AppForm
              schema={forgotSchema}
              defaultValues={{ email: "" }}
              onSubmit={handleForgot}
              className="mt-8 space-y-5"
            >
              <TextField
                name="email"
                label="Email Address"
                type="email"
                icon={Mail}
                placeholder="you@company.com"
                required
              />
              <SubmitButton>Send Reset Link</SubmitButton>
            </AppForm>
          </>
        ) : (
          <>
            <h1
              className="mt-3  font-black uppercase leading-tight tracking-tight text-black sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Check your inbox.
            </h1>
            <div className="mt-6 border border-stone-200 bg-stone-50 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700"
                  strokeWidth={1.8}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/55">
                    Reset link sent to
                  </p>
                  <p className="mt-1 truncate font-mono text-sm font-bold text-black">
                    {emailSent}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-black/55">
              Didn't receive it? Check spam, or{" "}
              <button
                onClick={() => setEmailSent("")}
                className="border-b border-blue-700/40 pb-0.5 font-bold text-black hover:border-blue-700"
              >
                try again
              </button>
              .
            </p>
          </>
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
