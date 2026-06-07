"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Mail, RotateCw, ShieldOff } from "lucide-react";
import { apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";


const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function PortalAccessPanel({ tenantId, onChange, canManage = false }) {
  const [status, setStatus] = useState({ loading: true, data: null });
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);


  const [sendEmail, setSendEmail] = useState(true);


  const [issuedInvite, setIssuedInvite] = useState(null);
  const linkBlockRef = useRef(null);

  const loadStatus = useCallback(async () => {
    if (!tenantId) return;
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const data = await apiFetch(`/tenants/${tenantId}/portal-invite`);
      setStatus({ loading: false, data });
    } catch (error) {
      console.error("Failed to load portal status:", error);
      showToast.error(error.message || "Failed to load portal status");
      setStatus({ loading: false, data: null });
    }
  }, [tenantId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);


  const generate = useCallback(async () => {
    if (!tenantId) return;
    setGenerating(true);
    try {
      const invite = await apiFetch(`/tenants/${tenantId}/portal-invite`, {
        method: "POST",
        body: { sendEmail },
      });
      setIssuedInvite(invite);
      if (invite?.emailSent) {
        showToast.success(`Invite emailed to ${invite.email}.`);
      } else if (!sendEmail) {
        showToast.success("Link generated. Copy below to share.");
      } else {
        showToast.info(
          `Link generated, but email didn't go out: ${invite?.emailSkippedReason || "unknown reason"}.`,
        );
      }
    } catch (error) {
      console.error("Failed to generate portal link:", error);
      showToast.error(error.message || "Failed to generate portal link");
    } finally {
      setGenerating(false);
    }
  }, [tenantId, sendEmail]);


  useEffect(() => {
    if (!issuedInvite?.acceptUrl) return;
    linkBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [issuedInvite?.acceptUrl]);


  const revoke = useCallback(async () => {
    if (!tenantId) return;
    const confirmed = window.confirm(
      "Revoke portal access for this tenant?\n\nThis signs them out and invalidates every link that's been sent.",
    );
    if (!confirmed) return;
    setRevoking(true);
    try {
      await apiFetch(`/tenants/${tenantId}/portal-invite`, { method: "DELETE" });
      setIssuedInvite(null);
      showToast.success("All portal links revoked.");
      await loadStatus();
      await onChange?.();
    } catch (error) {
      console.error("Failed to revoke portal access:", error);
      showToast.error(error.message || "Failed to revoke portal access");
    } finally {
      setRevoking(false);
    }
  }, [tenantId, loadStatus, onChange]);

  const copyLink = useCallback(async () => {
    const link = issuedInvite?.acceptUrl;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast.success("Link copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy link:", error);
      showToast.error("Copy failed — select and copy the link manually.");
    }
  }, [issuedInvite?.acceptUrl]);

  const data = status.data;
  const linked = data?.linked;
  const pending = data?.pendingInvitation;
  const canRevoke = Boolean(linked || pending);

  return (
    <section className="border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Portal Access
          </p>
          <h3
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {linked
              ? "Account linked"
              : pending && !pending.expired
                ? "Invitation pending"
                : "No portal access"}
          </h3>
          <p className="mt-1 text-sm text-black/55">
            {statusBlurb({ linked, pending, tenantEmail: data?.tenantEmail })}
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && !linked && (
              <button
                type="button"
                onClick={generate}
                disabled={generating || (sendEmail && !data?.tenantEmail)}
                title={
                  sendEmail && !data?.tenantEmail
                    ? "Add an email to this tenant, or turn off Email"
                    : undefined
                }
                className="inline-flex items-center gap-2 bg-blue-700 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                {generating
                  ? "Generating…"
                  : pending
                    ? "Regenerate Link"
                    : "Generate Link"}
              </button>
            )}
            {canManage && canRevoke && (
              <button
                type="button"
                onClick={revoke}
                disabled={revoking}
                className="inline-flex items-center gap-2 border border-stone-300 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                {revoking
                  ? "Revoking…"
                  : linked
                    ? "Revoke Access"
                    : "Revoke All Links"}
              </button>
            )}
          </div>
          {canManage && !linked && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/55 select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-700"
              />
              Email tenant
            </label>
          )}
        </div>
      </div>


      {issuedInvite?.acceptUrl && (
        <div
          ref={linkBlockRef}
          className="mt-4 border-2 border-blue-700 bg-blue-50 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700">
              Activation link · expires {formatDate(issuedInvite.expiresAt)}
            </p>
            <div className="flex items-center gap-2">
              {canManage && (
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-1 border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-stone-100 disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" strokeWidth={1.8} />
                Regenerate
              </button>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1 bg-blue-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-800"
              >
                <Copy className="h-3 w-3" strokeWidth={1.8} />
                Copy
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={issuedInvite.acceptUrl}
            onFocus={(e) => e.target.select()}
            className="mt-2 min-h-20 w-full resize-none break-all border border-stone-300 bg-white p-2 font-mono text-xs text-black outline-none focus:border-blue-700"
          />
          <p className="mt-2 text-xs text-black/55">
            {issuedInvite.emailSent
              ? `Emailed to ${issuedInvite.email}. Share manually if it doesn't arrive.`
              : sendEmail
                ? `Email didn't go out (${issuedInvite.emailSkippedReason || "unknown reason"}). Copy and share via WhatsApp, SMS, etc.`
                : "Copy and share via WhatsApp, SMS, or any channel you prefer."}
          </p>
        </div>
      )}


      {!linked && pending && !pending.expired && !issuedInvite && (
        <p className="mt-3 text-xs text-black/55">
          A previous link was issued on {formatDate(pending.issuedAt)} and
          expires {formatDate(pending.expiresAt)}. We don't store the URL —
          regenerate to get a copyable link (this invalidates the old one).
        </p>
      )}
    </section>
  );
}

function statusBlurb({ linked, pending, tenantEmail }) {
  if (linked) {
    return `Tenant can sign in at /login using ${tenantEmail || "their email"}.`;
  }
  if (!tenantEmail) {
    return "Add an email to this tenant before generating a portal link.";
  }
  if (pending && !pending.expired) {
    return `Invitation issued — awaiting tenant to set their password.`;
  }
  if (pending?.expired) {
    return "Previous invitation expired. Generate a new link to retry.";
  }
  return "No invitation issued yet.";
}
