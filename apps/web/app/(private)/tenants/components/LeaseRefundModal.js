"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { Refunds } from "@/app/_lib/repositories";
import { formatCurrency } from "@/app/_lib/formatters";

const getTenantId = (tenant) => tenant?.tenant_id || tenant?.id || "";

export default function LeaseRefundModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [deductions, setDeductions] = useState([{ label: "", amount: "" }]);
  const [leaseEndDate, setLeaseEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [processing, setProcessing] = useState(false);

  const tenantId = getTenantId(tenant);
  const deposit = Number(tenant?.deposit_amount || 0);
  const manualDeductions = useMemo(
    () =>
      deductions
        .map((item) => ({
          label: String(item.label || "").trim(),
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.label && item.amount > 0),
    [deductions],
  );
  const manualTotal = manualDeductions.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const arrearsTotal = Number(summary?.arrears_total || 0);
  const totalDeductions = manualTotal + arrearsTotal;
  const netRefund = Math.max(0, deposit - totalDeductions);

  useEffect(() => {
    if (!isOpen) return;
    setDeductions([{ label: "", amount: "" }]);
    setLeaseEndDate(new Date().toISOString().split("T")[0]);
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    let cancelled = false;
    setLoadingSummary(true);
    Refunds.getTenantSummary(tenantId)
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch((err) => {
        console.error("Failed to load tenant refund summary:", err);
        if (!cancelled) {
          setSummary(null);
          showToast.error("Failed to load tenant arrears.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId]);

  const updateDeduction = (index, key, value) => {
    setDeductions((prev) =>
      prev.map((item, current) =>
        current === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const removeDeduction = (index) => {
    setDeductions((prev) =>
      prev.length === 1 ? [{ label: "", amount: "" }] : prev.filter((_, i) => i !== index),
    );
  };

  const handleProcess = async () => {
    if (!tenantId) {
      showToast.error("Tenant id is missing.");
      return;
    }
    setProcessing(true);
    try {
      await Refunds.process({
        tenant_id: tenantId,
        tenant_name: tenant?.full_name || tenant?.tenant_name,
        property_name: tenant?.property_name,
        unit_id:
          tenant?.unit_id && typeof tenant.unit_id === "object"
            ? tenant.unit_id.id
            : tenant?.unit_id,
        unit_number: tenant?.unit_number,
        lease_end_date: leaseEndDate,
        total_deposit: deposit,
        fault_deductions: 0,
        deduction_items: manualDeductions,
      });
      showToast.success("Lease cancelled and refund processed.");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to process lease refund:", err);
      showToast.error(err?.message || "Failed to process refund.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ModalSlider
      isOpen={isOpen}
      onClose={processing ? undefined : onClose}
      title={`Move Out Refund: ${tenant?.full_name || tenant?.tenant_name || ""}`}
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
          <RefundStat label="Deposit" value={deposit} />
          <RefundStat label="Deductions" value={totalDeductions} accent="text-amber-700" />
          <RefundStat label="Net Refund" value={netRefund} accent="text-green-700" />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Lease end date
            </label>
            <input
              type="date"
              value={leaseEndDate}
              onChange={(event) => setLeaseEndDate(event.target.value)}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div className="border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Arrears deducted
            </p>
            <p
              className="mt-1 font-mono text-lg font-black tabular-nums text-red-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {loadingSummary ? "Loading..." : formatCurrency(arrearsTotal)}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">— Deposit Deductions —</p>
              <h3
                className="mt-1 text-lg font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Repairs and charges
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setDeductions((prev) => [...prev, { label: "", amount: "" }])
              }
              className="inline-flex items-center gap-2 border border-stone-300 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/65 transition-colors hover:border-blue-700 hover:text-blue-700"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {deductions.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2"
              >
                <input
                  type="text"
                  value={item.label}
                  onChange={(event) =>
                    updateDeduction(index, "label", event.target.value)
                  }
                  placeholder="e.g. Paint, broken lock"
                  className="min-w-0 border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
                <input
                  type="number"
                  min="0"
                  value={item.amount}
                  onChange={(event) =>
                    updateDeduction(index, "amount", event.target.value)
                  }
                  placeholder="0"
                  className="min-w-0 border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
                <button
                  type="button"
                  onClick={() => removeDeduction(index)}
                  className="inline-flex h-10 w-9 items-center justify-center border border-stone-300 text-black/55 transition-colors hover:border-red-300 hover:text-red-700"
                  aria-label="Remove deduction"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-stone-200 pt-4">
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing || loadingSummary}
            className="w-full bg-blue-700 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Processing..." : "Process refund and cancel lease"}
          </button>
        </div>
      </div>
    </ModalSlider>
  );
}

function RefundStat({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-black tabular-nums ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
