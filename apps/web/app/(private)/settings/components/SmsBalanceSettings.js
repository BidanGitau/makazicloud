"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WalletCards } from "lucide-react";
import { showToast } from "@/app/_components/CustomToast";
import { apiFetch } from "@/app/_lib/api/client";

export default function SmsBalanceSettings() {
  const [balance, setBalance] = useState(null);
  const [providerResponse, setProviderResponse] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/sms/balance");
      setBalance(result?.balance ?? null);
      setProviderResponse(result?.response ?? null);
      setLastCheckedAt(new Date());
    } catch (error) {
      showToast.error(error?.message || "Failed to check SMS balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <p className="section-label">— Messaging —</p>
        <h2
          className="mt-2 text-base font-black uppercase tracking-tight text-black sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SMS balance
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-black/55">
          Check the current Emalify SMS credit balance for arrears reminders and
          tenant notices.
        </p>
      </header>

      <div className="border border-stone-200 bg-stone-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-stone-200 bg-white text-blue-700">
              <WalletCards size={22} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
                Available SMS credits
              </p>
              <p className="mt-1 text-4xl font-black text-black">
                {loading
                  ? "..."
                  : balance === null
                    ? "Unavailable"
                    : typeof balance === "number"
                      ? balance.toLocaleString("en-KE")
                      : balance}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchBalance}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              strokeWidth={1.8}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Checking..." : "Check balance"}
          </button>
        </div>

        {lastCheckedAt && (
          <p className="mt-4 text-xs font-medium text-black/45">
            Last checked: {lastCheckedAt.toLocaleString()}
          </p>
        )}
      </div>

      {providerResponse && balance === null && (
        <div className="mt-5 border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
            Provider response
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-black/60">
            {typeof providerResponse === "string"
              ? providerResponse
              : JSON.stringify(providerResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
