"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";

const emptyForm = {
  shortcode: "",
  environment: "production",
  consumerKey: "",
  consumerSecret: "",
  passkey: "",
  isActive: true,
};

export default function MpesaSettings() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

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
          Connect this workspace's PayBill. Tenant payments are matched by PayBill
          shortcode and house/unit number.
        </p>
      </header>

      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PayBill shortcode">
            <input
              value={form.shortcode}
              onChange={(e) => update("shortcode", e.target.value)}
              className="h-11 w-full border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
              required
            />
          </Field>
          <Field label="Environment">
            <select
              value={form.environment}
              onChange={(e) => update("environment", e.target.value)}
              className="h-11 w-full border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </Field>
          <Field label="Consumer key">
            <input
              value={form.consumerKey}
              onChange={(e) => update("consumerKey", e.target.value)}
              className="h-11 w-full border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
              placeholder={status?.hasConsumerKey ? "Saved" : ""}
            />
          </Field>
          <Field label="Consumer secret">
            <input
              type="password"
              value={form.consumerSecret}
              onChange={(e) => update("consumerSecret", e.target.value)}
              className="h-11 w-full border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
              placeholder={status?.hasConsumerSecret ? "Saved" : ""}
            />
          </Field>
          <Field label="Passkey">
            <input
              type="password"
              value={form.passkey}
              onChange={(e) => update("passkey", e.target.value)}
              className="h-11 w-full border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
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
        <p>Confirmation URL: https://makazicloud.com/api/mpesa/c2b/confirmation</p>
        <p>Validation URL: https://makazicloud.com/api/mpesa/c2b/validation</p>
        {status?.lastCallbackAt && (
          <p className="mt-2">Last callback: {new Date(status.lastCallbackAt).toLocaleString()}</p>
        )}
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
