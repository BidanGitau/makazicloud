"use client";

import { useState, Suspense } from "react";
import Link from "@/app/_components/AppLink";
import { useSearchParams } from "@/app/_hooks/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const STEPS = [
  "Open your email inbox",
  "Find the Makazicloud message",
  "Click the verification link",
  "You'll land in your dashboard",
];

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { resendVerificationEmail } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResendEmail = async () => {
    if (!email) {
      setError("No email address provided. Please sign up again.");
      return;
    }
    setIsResending(true);
    setMessage("");
    setError("");
    try {
      const result = await resendVerificationEmail(email);
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full max-w-md">
        <p className="section-label">— Email Verification —</p>
        <h1
          className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-black sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Check your inbox.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-black/55">
          We sent a verification link to:
        </p>

        {email && (
          <div className="mt-4 border border-stone-200 bg-stone-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              Sent to
            </p>
            <p className="mt-1 truncate font-mono text-sm font-bold text-black">
              {email}
            </p>
          </div>
        )}

        <div className="mt-8 border border-stone-200">
          <div className="border-b border-stone-200 px-5 py-3">
            <p className="section-label">— What to do next —</p>
          </div>
          <ol className="divide-y divide-stone-200">
            {STEPS.map((step, idx) => (
              <li
                key={step}
                className="flex items-baseline gap-4 px-5 py-3.5"
              >
                <span
                  className="font-mono text-sm font-black tabular-nums text-black/30"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-black/70">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {message && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
            <CheckCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
              strokeWidth={1.8}
            />
            <p className="text-[12px] font-bold text-black">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700"
              strokeWidth={1.8}
            />
            <p className="text-[12px] font-bold text-black">{error}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-3">
          <button
            onClick={handleResendEmail}
            disabled={isResending || !email}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`}
              strokeWidth={1.8}
            />
            {isResending ? "Sending…" : "Resend Verification Email"}
          </button>

          <Link
            href="/login"
            className="group inline-flex min-h-12 items-center justify-center gap-2 bg-blue-700 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            Go to Sign In
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-stone-200 pt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-black/55">
          <Link
            href="/management-signup"
            className="inline-flex items-center gap-2 hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Wrong email? Sign up again
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="text-center">
        <p className="section-label animate-pulse">— Loading —</p>
        <p
          className="mt-3 text-2xl font-black uppercase tracking-tight text-black/30"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Preparing…
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
