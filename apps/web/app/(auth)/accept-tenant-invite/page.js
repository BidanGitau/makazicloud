"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "@/app/_hooks/navigation";
import { apiFetch, ApiError } from "@/app/_lib/api/client";
import { fetchCurrentUser } from "@/app/_lib/api/auth";
import TenantPasswordForm from "@/app/(tenant)/portal/TenantPasswordForm";


function readTokenFromFragment() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  return params.get("token");
}

export default function AcceptTenantInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("loading");
  const [invitation, setInvitation] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const t = readTokenFromFragment();
    setToken(t);
    if (!t) {
      setStatus("error");
      setErrorMsg("This tenant portal link is missing a token.");
      return;
    }

    apiFetch(`/public/tenant-portal-invitations/${t}`)
      .then((data) => {
        setInvitation(data);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(
          err instanceof ApiError
            ? err.body?.message || err.message
            : "Couldn't load this tenant portal link.",
        );
      });


  }, []);

  const handleSubmit = async (values) => {
    try {
      await apiFetch(`/public/tenant-portal-invitations/${token}/accept`, {
        method: "POST",
        body: { password: values.newPassword },
      });
      await fetchCurrentUser();
      setStatus("done");
      setTimeout(() => router.replace("/tenant-portal"), 1200);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.body?.message || err.message
          : "Failed to activate tenant portal.",
      );
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <p className="section-label">— Tenant Portal —</p>
        <h2
          className="mt-3 font-black uppercase leading-tight tracking-tight text-black sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {status === "done" ? "Portal activated." : "Set your password."}
        </h2>

        {status === "loading" && (
          <div className="mt-10 flex items-center gap-3 text-black/55">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
            <p className="text-sm">Checking your tenant portal link…</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" strokeWidth={1.8} />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-red-700">
                Couldn't open tenant portal link
              </p>
              <p className="mt-1 text-sm text-black/65">{errorMsg}</p>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="mt-8 flex items-start gap-3 border-l-2 border-blue-700 bg-blue-50 p-4">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" strokeWidth={1.8} />
            <p className="text-sm text-black/75">
              Your tenant account is ready. Redirecting to your portal…
            </p>
          </div>
        )}

        {status === "ready" && invitation && (
          <>
            <p className="mt-3 text-sm leading-relaxed text-black/55">
              <strong className="text-black">{invitation.tenant?.fullName}</strong>,
              activate your tenant portal for{" "}
              <strong className="text-black">
                {invitation.organization?.name || "MakaziCloud"}
              </strong>
              . This account is for{" "}
              <strong className="text-black">
                {invitation.tenant?.propertyName || "your property"}
                {invitation.tenant?.unitNumber ? ` · Unit ${invitation.tenant.unitNumber}` : ""}
              </strong>
              .
            </p>

            {errorMsg && (
              <div className="mt-6 flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" strokeWidth={1.8} />
                <p className="text-sm text-black/75">{errorMsg}</p>
              </div>
            )}

            <div className="mt-8">
              <TenantPasswordForm
                mode="set"
                onSubmit={handleSubmit}
                submitLabel="Activate Portal"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
