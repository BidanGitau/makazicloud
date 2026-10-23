"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";

export default function DisburseConfirmDialog({
  monthLabel,
  propertyName,
  amount,
  saving,
  onCancel,
  onConfirm,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-amber-500 text-white">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">
                Confirm release
              </p>
              <h3
                className="mt-1 text-xl font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Disburse funds
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2 text-black/55 transition-colors hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-black/70">
            Make sure commission, repairs, and advances for{" "}
            <span className="font-semibold text-black">{propertyName}</span> in{" "}
            <span className="font-semibold text-black">{monthLabel}</span> are
            captured correctly.
          </p>
          <div className="border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              Amount to owner
            </p>
            <p className="mt-1 text-lg font-black tabular-nums text-green-700">
              {formatCurrency(amount)}
            </p>
          </div>
          <p className="text-sm font-medium text-amber-800">
            Once released, this month cannot be amended.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center justify-center whitespace-nowrap border border-stone-300 px-4 h-9 text-[11px] font-bold uppercase tracking-[0.2em] text-black/70 hover:bg-stone-50 disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center justify-center whitespace-nowrap bg-black px-4 h-9 text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:bg-black/80 disabled:opacity-45"
          >
            {saving ? "Releasing..." : "Okay, release"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
