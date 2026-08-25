"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, WalletCards } from "lucide-react";
import { showToast } from "@/app/_components/CustomToast";
import { apiFetch } from "@/app/_lib/api/client";

export default function SmsBalanceSettings() {
  const [balance, setBalance] = useState(null);
  const [localBalance, setLocalBalance] = useState(null);
  const [providerResponse, setProviderResponse] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [lastTopUp, setLastTopUp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/sms/balance");
      setBalance(result?.balance ?? null);
      setLocalBalance(result?.localBalance ?? null);
      setProviderResponse(result?.response ?? null);
      setLastTopUp({
        amount: result?.lastTopUpAmount ?? null,
        units: result?.lastTopUpSmsUnits ?? null,
        date: result?.lastTopUpAt ? new Date(result.lastTopUpAt) : null,
      });
      setLastCheckedAt(result?.lastSentAt ? new Date(result.lastSentAt) : new Date());
    } catch (error) {
      showToast.error(error?.message || "Failed to check SMS balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const handleSmsBalanceUpdated = (event) => {
      const result = event.detail || {};
      setBalance(result?.balance ?? null);
      setLocalBalance(result?.localBalance ?? null);
      setProviderResponse(result?.response ?? null);
      setLastCheckedAt(new Date());
    };
    window.addEventListener("makazicloud:sms-balance-updated", handleSmsBalanceUpdated);
    return () => {
      window.removeEventListener(
        "makazicloud:sms-balance-updated",
        handleSmsBalanceUpdated,
      );
    };
  }, []);

  const handleTopUp = async (event) => {
    event.preventDefault();
    setTopUpLoading(true);
    try {
      const result = await apiFetch("/sms/top-up", {
        method: "POST",
        body: {
          amount,
          phone,
        },
      });
      setLocalBalance(result?.localBalance ?? null);
      setProviderResponse(result?.response ?? null);
      setLastTopUp({
        amount: result?.amount ?? amount,
        units: result?.purchasedUnits ?? null,
        date: new Date(),
      });
      setAmount("");
      showToast.success(
        `Top-up started. ${Number(result?.purchasedUnits || 0).toLocaleString("en-KE")} SMS units added.`,
      );
      window.dispatchEvent(
        new CustomEvent("makazicloud:sms-balance-updated", { detail: result }),
      );
    } catch (error) {
      showToast.error(error?.message || "Failed to start SMS top-up");
    } finally {
      setTopUpLoading(false);
    }
  };

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
          Buy SMS credits and check the current provider balance for arrears
          reminders and tenant notices.
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
                Organization SMS units
              </p>
              <p className="mt-1 text-4xl font-black text-black">
                {loading
                  ? "..."
                  : localBalance === null
                    ? "Unavailable"
                    : Number(localBalance).toLocaleString("en-KE")}
              </p>
              {balance !== null && (
                <p className="mt-1 text-xs font-medium text-black/45">
                  Provider balance:{" "}
                  {typeof balance === "number"
                    ? balance.toLocaleString("en-KE")
                    : balance}
                </p>
              )}
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

      <form
        onSubmit={handleTopUp}
        className="mt-5 border border-stone-200 bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-stone-200 bg-stone-50 text-blue-700">
            <CreditCard size={20} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              M-Pesa top-up
            </p>
            {lastTopUp?.date && (
              <p className="mt-1 text-xs font-medium text-black/45">
                Last top-up: KES {Number(lastTopUp.amount || 0).toLocaleString("en-KE")} /{" "}
                {Number(lastTopUp.units || 0).toLocaleString("en-KE")} SMS units
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              Amount
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 h-12 w-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-black outline-none focus:border-blue-700"
              required
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              M-Pesa phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0703947052"
              className="mt-2 h-12 w-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-black outline-none focus:border-blue-700"
              required
            />
          </label>
          <button
            type="submit"
            disabled={topUpLoading}
            className="inline-flex h-12 items-center justify-center gap-2 bg-black px-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            <CreditCard size={16} strokeWidth={1.8} />
            {topUpLoading ? "Starting..." : "Top up"}
          </button>
        </div>
      </form>

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
