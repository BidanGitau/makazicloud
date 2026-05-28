"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import Link from "@/app/_components/AppLink";
import { useAuth } from "@/app/_context/AuthContext";
import {
  AppForm,
  TextField,
  PasswordField,
  SubmitButton,
} from "@/app/_components/forms";
import { Mail, AlertCircle, CheckCircle, Timer } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const STATS = [
  { value: "500+", label: "Properties" },
  { value: "2,000+", label: "Tenants" },
  { value: "95%", label: "Collection" },
];

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login, resendVerificationEmail } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showVerificationOption, setShowVerificationOption] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailForResend, setEmailForResend] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutTimer = useRef(null);

  useEffect(() => () => clearInterval(lockoutTimer.current), []);

  const startLockout = () => {
    setLockoutSeconds(LOCKOUT_SECONDS);
    lockoutTimer.current = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          clearInterval(lockoutTimer.current);
          setFailedAttempts(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const isLockedOut = lockoutSeconds > 0;

  const handleLogin = async (values) => {
    if (isLockedOut) return;
    setErrorMsg("");
    setSuccessMsg("");
    setShowVerificationOption(false);
    setEmailForResend(values.email);

    try {
      await login(values);
      setFailedAttempts(0);
    } catch (err) {
      const errorMessage = err.message || "Invalid login credentials";
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        setErrorMsg(
          `Too many failed attempts. Wait ${LOCKOUT_SECONDS}s before retrying.`,
        );
      } else {
        setErrorMsg(
          `${errorMessage} (${newAttempts}/${MAX_ATTEMPTS} attempts)`,
        );
        const m = errorMessage.toLowerCase();
        if (m.includes("verify") || m.includes("confirm")) {
          setShowVerificationOption(true);
        }
      }

      throw err;
    }
  };

  const handleResendVerification = async () => {
    if (!emailForResend) {
      setErrorMsg("Please enter your email address first");
      return;
    }
    setResendingEmail(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const result = await resendVerificationEmail(emailForResend);
      setSuccessMsg(result.message);
      setShowVerificationOption(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to resend verification email");
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-blue-700 px-10 py-14 text-white lg:flex lg:px-14 xl:px-20">
        <p className="section-label !text-white/45">— Welcome back —</p>
        <div>
          <h1
            className=" font-black uppercase leading-[0.95] tracking-tight xl:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sign in.
            <br />
            <span className="text-white/30">Run your portfolio.</span>
          </h1>
          <p className="mt-6 max-w-md text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
            Trusted by 500+ property managers across Kenya
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 pt-px">
          {STATS.map((s) => (
            <div key={s.label} className="bg-blue-700 px-4 py-5">
              <p
                className="text-base font-black tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="w-full max-w-md">
          <p className="section-label">— Sign in —</p>
          <h2
            className="mt-3 text-base font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Access your dashboard.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-black/55">
            New to Makazicloud?{" "}
            <Link
              href="/management-signup"
              className="border-b border-blue-700/40 pb-0.5 font-bold text-blue-700 hover:border-blue-700"
            >
              Create an account
            </Link>
          </p>

          {successMsg && (
            <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-blue-50 p-4">
              <CheckCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                strokeWidth={1.8}
              />
              <p className="text-[12px] font-bold text-black">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-blue-50 p-4">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-[12px] font-bold text-black">{errorMsg}</p>
                {showVerificationOption && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="mt-2 border-b border-blue-700/40 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black hover:border-blue-700 disabled:opacity-50"
                  >
                    {resendingEmail ? "Sending…" : "Resend verification email"}
                  </button>
                )}
              </div>
            </div>
          )}

          <AppForm
            schema={loginSchema}
            defaultValues={{ email: "", password: "" }}
            onSubmit={handleLogin}
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                  Password
                </span>
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55 hover:text-black"
                >
                  Forgot?
                </Link>
              </div>
              <PasswordField name="password" placeholder="••••••••" required />
            </div>

            {isLockedOut && (
              <div className="flex items-center gap-2 border border-blue-700 bg-stone-50 p-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black">
                <Timer className="h-3.5 w-3.5" strokeWidth={1.8} />
                Locked · Try again in{" "}
                <span className="font-mono tabular-nums">
                  {lockoutSeconds}s
                </span>
              </div>
            )}

            <SubmitButton disabled={isLockedOut}>
              {isLockedOut ? `Locked (${lockoutSeconds}s)` : "Sign In"}
            </SubmitButton>
          </AppForm>
        </div>
      </div>
    </div>
  );
}
