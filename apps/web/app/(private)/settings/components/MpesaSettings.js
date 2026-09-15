"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";

const emptyForm = {
  shortcode: "",
  accountType: "paybill",
  listenerPhone: "",
  storeOwnerName: "",
  environment: "production",
  consumerKey: "",
  consumerSecret: "",
  passkey: "",
  isActive: true,
};

const fieldControlClass =
  "h-9 w-full border border-stone-300 px-3 text-sm outline-none transition-colors focus:border-blue-700";

export default function MpesaSettings() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const callbackBaseUrl = `${API_BASE_URL}/mpesa/c2b`;

  useEffect(() => {
    let cancelled = false;
    apiFetch("/mpesa/config")
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        if (data?.configured) {
          setForm((prev) => ({
            ...prev,
            shortcode: data.shortcode || "",
            accountType: data.accountType || "paybill",
            listenerPhone: data.listenerPhone || "",
            storeOwnerName: data.storeOwnerName || "",
            environment: data.environment || "production",
            isActive: data.isActive !== false,
          }));
        }
      })
      .catch((err) => showToast.error(err?.message || "Failed to load M-Pesa settings"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        shortcode: form.shortcode,
        accountType: form.accountType,
        listenerPhone: form.listenerPhone,
        storeOwnerName: form.storeOwnerName,
        environment: form.environment,
        isActive: form.isActive,
        ...(form.consumerKey ? { consumerKey: form.consumerKey } : {}),
        ...(form.consumerSecret ? { consumerSecret: form.consumerSecret } : {}),
        ...(form.passkey ? { passkey: form.passkey } : {}),
      };
      const next = await apiFetch("/mpesa/config", { method: "POST", body: payload });
      setStatus(next);
      setForm((prev) => ({ ...prev, consumerKey: "", consumerSecret: "", passkey: "" }));
      showToast.success("M-Pesa settings saved");
    } catch (err) {
      showToast.error(err?.message || "Failed to save M-Pesa settings");
    } finally {
      setSaving(false);
    }
  };

  const registerUrls = async () => {
    setRegistering(true);
    try {
      await apiFetch("/mpesa/register-url", { method: "POST" });
      const next = await apiFetch("/mpesa/config");
      setStatus(next);
      showToast.success("Daraja callback URLs registered");
    } catch (err) {
      showToast.error(err?.message || "Failed to register Daraja URLs");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="h-32 animate-pulse bg-stone-100" />;
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <p className="section-label">— PayBill —</p>
        <h2
          className="mt-2 text-base font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          M-Pesa integration
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-black/55">
          Map this workspace to a PayBill or Till, the store phone that receives
          Safaricom SMS, then either Daraja C2B or the Android SMS gateway.
        </p>
      </header>

      <ol className="mb-8 grid gap-3 text-xs text-black/65 sm:grid-cols-2">
        <li className="border border-stone-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">1. Android listener</p>
          <p className="mt-1">Always-on phone on the business M-Pesa line. App forwards sender MPESA only.</p>
        </li>
        <li className="border border-stone-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">2. Webhook bridge</p>
          <p className="mt-1">POST the raw SMS JSON to the inbound URL below.</p>
        </li>
        <li className="border border-stone-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">3. Parser and ledger</p>
          <p className="mt-1">Server extracts receipt, amount, phone, and unit after #, then matches a tenant.</p>
        </li>
        <li className="border border-stone-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">4. This dashboard</p>
          <p className="mt-1">PayBill/Till + store owner phone map inbound SMS to this organization.</p>
        </li>
      </ol>

      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account type">
            <select
              value={form.accountType}
              onChange={(e) => update("accountType", e.target.value)}
              className={fieldControlClass}
            >
              <option value="paybill">PayBill</option>
              <option value="till">Till</option>
            </select>
          </Field>
          <Field label={form.accountType === "till" ? "Till number" : "PayBill shortcode"}>
            <input
              value={form.shortcode}
              onChange={(e) => update("shortcode", e.target.value)}
              className={fieldControlClass}
              required
            />
          </Field>
          <Field label="Store / listener phone">
            <input
              value={form.listenerPhone}
              onChange={(e) => update("listenerPhone", e.target.value)}
              className={fieldControlClass}
              placeholder="2547... phone that receives MPESA SMS"
            />
          </Field>
          <Field label="Store owner name">
            <input
              value={form.storeOwnerName}
              onChange={(e) => update("storeOwnerName", e.target.value)}
              className={fieldControlClass}
              placeholder="Optional"
            />
          </Field>
          <Field label="Environment">
            <select
              value={form.environment}
              onChange={(e) => update("environment", e.target.value)}
              className={fieldControlClass}
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </Field>
          <Field label="Consumer key">
            <input
              value={form.consumerKey}
              onChange={(e) => update("consumerKey", e.target.value)}
              className={fieldControlClass}
              placeholder={status?.hasConsumerKey ? "Saved" : ""}
            />
          </Field>
          <Field label="Consumer secret">
            <input
              type="password"
              value={form.consumerSecret}
              onChange={(e) => update("consumerSecret", e.target.value)}
              className={fieldControlClass}
              placeholder={status?.hasConsumerSecret ? "Saved" : ""}
            />
          </Field>
          <Field label="Passkey">
            <input
              type="password"
              value={form.passkey}
              onChange={(e) => update("passkey", e.target.value)}
              className={fieldControlClass}
              placeholder={status?.hasPasskey ? "Saved" : "Optional for C2B"}
            />
          </Field>
          <label className="flex items-center gap-3 border border-stone-200 px-4 py-3 text-sm font-semibold text-black/70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            Active for callbacks
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
          <button
            type="button"
            onClick={registerUrls}
            disabled={registering || !status?.configured}
            className="border border-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 disabled:opacity-50"
          >
            {registering ? "Registering..." : "Register callbacks"}
          </button>
        </div>
      </form>

      <div className="mt-6 border border-stone-200 bg-stone-50 p-4 text-xs text-black/60">
        <p>Confirmation URL: {callbackBaseUrl}/confirmation</p>
        <p>Validation URL: {callbackBaseUrl}/validation</p>
        {status?.lastCallbackAt && (
          <p className="mt-2">Last callback: {new Date(status.lastCallbackAt).toLocaleString()}</p>
        )}
      </div>

      <SmsGatewaySettings status={status} onTokenCreated={(next) => setStatus((prev) => ({ ...prev, ...next }))} />
    </div>
  );
}

function SmsGatewaySettings({ status, onTokenCreated }) {
  const [token, setToken] = useState("");
  const [generating, setGenerating] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const apiBase = /^https?:\/\//i.test(API_BASE_URL)
    ? API_BASE_URL.replace(/\/+$/, "")
    : `${origin}${API_BASE_URL}`.replace(/\/+$/, "");
  const inboundUrl = `${apiBase}/sms-gateway/inbound${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;

  const generate = async () => {
    setGenerating(true);
    try {
      const next = await apiFetch("/mpesa/sms-gateway-token", { method: "POST" });
      setToken(next.token || "");
      onTokenCreated({
        hasSmsGatewayToken: true,
      });
      showToast.success("SMS gateway token created. Copy it now — it will not be shown again.");
    } catch (err) {
      showToast.error(err?.message || "Failed to create SMS gateway token");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast.success("Copied");
    } catch {
      showToast.error("Could not copy");
    }
  };

  return (
    <div className="mt-10 border border-stone-200 p-5">
      <p className="section-label">— Android SMS gateway —</p>
      <h3
        className="mt-2 text-sm font-black uppercase tracking-tight text-black"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Forward PayBill confirmation SMS
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-black/55">
        Put this URL in an Android SMS listener (SMS Forwarder, Tasker, or your
        Makazi app). When Safaricom sends the official confirmation to that
        phone, the app POSTs the full message here. Account refs like{" "}
        <span className="font-mono text-black">347086#m6</span> use the part
        after <span className="font-mono">#</span> as the house/unit.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={generating || !status?.configured}
          className="bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50"
        >
          {generating
            ? "Creating..."
            : status?.hasSmsGatewayToken
              ? "Rotate webhook token"
              : "Create webhook token"}
        </button>
      </div>

      {!status?.configured && (
        <p className="mt-3 text-xs text-black/50">
          Save the PayBill or Till shortcode above first.
        </p>
      )}

      {token ? (
        <div className="mt-4 space-y-3 text-xs">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              Webhook URL
            </span>
            <div className="flex gap-2">
              <input readOnly value={inboundUrl} className={`${fieldControlClass} font-mono`} />
              <button
                type="button"
                onClick={() => copy(inboundUrl)}
                className="border border-stone-300 px-3 text-[10px] font-bold uppercase tracking-[0.16em]"
              >
                Copy
              </button>
            </div>
          </label>
          <p className="text-black/50">
            Last inbound:{" "}
            {status?.smsGatewayLastAt
              ? new Date(status.smsGatewayLastAt).toLocaleString()
              : "none yet"}
          </p>
        </div>
      ) : status?.hasSmsGatewayToken ? (
        <p className="mt-3 text-xs text-black/50">
          A token is already stored. Rotate it to get a new URL for the Android
          app. Last inbound:{" "}
          {status?.smsGatewayLastAt
            ? new Date(status.smsGatewayLastAt).toLocaleString()
            : "none yet"}
        </p>
      ) : null}

      <div className="mt-5 space-y-2 bg-stone-50 p-4 font-mono text-[11px] leading-relaxed text-black/65">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
          Android POST body
        </p>
        <pre>{`{
  "from": "MPESA",
  "text": "NKJ7XXXX Confirmed. on 15/9/26 at 1:42 PM Ksh2,000.00 received from JOHN DOE 254712345678. Account Number 347086#M6"
}`}</pre>
        <p className="font-sans text-black/50">
          Parsed groups: receipt, amount, phone, payer, account, unit after #.
          Unmatched SMS stay under Tenants → Unassigned payments for search and
          reconcile by house number.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
        {label}
      </span>
      {children}
    </label>
  );
}
