"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Ban, Loader } from "lucide-react";
import { Payments } from "@/app/_lib/repositories";

// mode: "void" cancels the payment; "correct" cancels it and records the right amount.
export default function PaymentVoidModal({ payment, mode = "void", onClose, onDone }) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setReason(mode === "correct" ? "Wrong amount entered" : "");
    setAmount("");
    setError(null);
  }, [payment?.id, mode]);

  if (!payment || !mounted) return null;

  const isCorrect = mode === "correct";
  const originalAmount = Number(payment.amount || 0);
  const paymentDate = payment.payment_date || payment.date;
  const canSubmit =
    reason.trim().length > 0 && (!isCorrect || Number(amount) > 0) && !saving;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isCorrect) {
        await Payments.correct(payment.id, Number(amount), reason.trim());
      } else {
        await Payments.void(payment.id, reason.trim());
      }
      onDone?.();
    } catch (err) {
      setError(err?.message || "Could not void this payment.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {isCorrect ? "Adjust Payment Amount" : "Void Payment"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3">
            <span className="text-gray-500">Amount</span>
            <span className="text-right font-semibold">
              KSh {originalAmount.toLocaleString("en-KE")}
            </span>
            <span className="text-gray-500">Date</span>
            <span className="text-right">
              {paymentDate ? new Date(paymentDate).toLocaleDateString() : "-"}
            </span>
            <span className="text-gray-500">Reference</span>
            <span className="text-right">{payment.reference || "-"}</span>
          </div>

          <p className="border-l-2 border-red-600 bg-red-50 p-3 text-red-800">
            {isCorrect
              ? "The original payment will be voided and its arrears rolled back, then the correct amount will be recorded and applied."
              : "The arrears months this payment cleared will be reopened. The payment stays in history marked as voided. This cannot be undone."}
          </p>

          {isCorrect && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Correct amount (KSh)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 w-full border border-stone-300 px-3 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Entered 50,000 instead of 5,000"
              className="w-full border border-stone-300 px-3 py-2 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Keep payment
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader className="h-4 w-4 animate-spin" />}
            {isCorrect ? "Void & re-record" : "Void payment"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
