"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/app/_hooks/navigation";
import Link from "@/app/_components/AppLink";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { logout as apiLogout } from "@/app/_lib/api/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handle() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDesc = hash.get("error_description") || hash.get("error");
      const type = hash.get("type");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (errorDesc) {
        setStatus("error");
        setMessage(errorDesc);
        return;
      }

      // Store tokens in sessionStorage so the reset-password page can call
      // setSession right before updateUser — avoids autoRefreshToken clearing
      // the invite session before the user submits the form.
      if ((type === "invite" || type === "recovery") && accessToken && refreshToken) {
        // Sign out any existing session so the invited user starts fresh and
        // doesn't inherit whoever's account was active in this browser.
        await apiLogout();
        sessionStorage.setItem("pending_access_token", accessToken);
        sessionStorage.setItem("pending_refresh_token", refreshToken);
        router.replace(
          type === "invite"
            ? "/reset-password?mode=invite"
            : "/reset-password"
        );
        return;
      }

      // Signup verification — Supabase already confirmed the email server-side.
      // No session needed; user logs in normally.
      if (type === "signup" || accessToken) {
        setStatus("success");
        setMessage("Your email has been verified. You can now log in.");
        return;
      }

      setStatus("error");
      setMessage("Invalid or expired link. Please try again.");
    }

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Checking…</h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Email Verified!</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link
              href="/login"
              className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Link Invalid</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
              <Link
                href="/management-signup"
                className="block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Sign Up Again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
