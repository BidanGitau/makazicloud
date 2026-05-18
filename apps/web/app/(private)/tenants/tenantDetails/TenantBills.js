"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ReceiptText } from "lucide-react";
import { UtilityBills } from "@/app/_lib/repositories";
import { useAuth } from "@/app/_context/AuthContext";
import { showToast } from "@/app/_components/CustomToast";
import { formatCurrency } from "@/app/_lib/formatters";
import { SERVICE_LABEL, billLocationLabel } from "../../utility/utilityConstants";

const statusStyle = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  unpaid: "bg-yellow-100 text-yellow-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function effectiveStatus(bill) {
  const total = Number(bill.total_amount || 0);
  const paid = Number(bill.paid_amount || 0);
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return String(bill.status || "unpaid").toLowerCase();
}

function formatMonth(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", {
    month: "short",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TenantBills({ unit }) {
  const { hasPermission } = useAuth();
  const canManageBills = hasPermission("utilities:manage");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const fetchBills = useCallback(async () => {
    if (!unit?.id) {
      setBills([]);
      return;
    }

    setLoading(true);
    try {
      const rows = await UtilityBills.getForTenantUnit(unit);
      setBills(rows || []);
    } catch (error) {
      console.error("Failed to load tenant bills:", error);
      showToast.error("Failed to load tenant bills.");
    } finally {
      setLoading(false);
    }
  }, [unit]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const totals = useMemo(
    () =>
      bills.reduce(
        (acc, bill) => {
          acc.total += Number(bill.total_amount || 0);
          acc.paid += Number(bill.paid_amount || 0);
          return acc;
        },
        { total: 0, paid: 0 },
      ),
    [bills],
  );
  const balance = Math.max(0, totals.total - totals.paid);

  const handleMarkPaid = async (bill) => {
    if (bill.assign_all && !bill.unit_id) {
      showToast.error("Shared bill payments need per-tenant allocation before marking paid here.");
      return;
    }

    setSavingId(bill.id);
    try {
      await UtilityBills.markPaid(bill);
      showToast.success("Bill marked as paid.");
      fetchBills();
    } catch (error) {
      console.error("Failed to mark bill paid:", error);
      showToast.error("Failed to mark bill paid.");
    } finally {
      setSavingId(null);
    }
  };

  if (!unit?.id) {
    return (
      <div className="border border-stone-200 bg-white p-5 text-sm text-black/55">
        Assign the tenant to a unit before bills can be shown.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-px border border-stone-200 bg-stone-200">
        <BillStat label="Bills" value={String(bills.length)} />
        <BillStat label="Paid" value={formatCurrency(totals.paid)} accent="text-green-700" />
        <BillStat label="Balance" value={formatCurrency(balance)} accent="text-blue-700" />
      </div>

      <div className="overflow-hidden border border-stone-200 bg-white">
        {loading ? (
          <div className="p-5 text-sm text-black/55">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 items-center justify-center bg-stone-100 text-black/45">
              <ReceiptText className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-bold text-black">No utility bills yet</p>
              <p className="mt-1 text-sm text-black/55">
                Bills added for this unit, or assigned to all units in this property, will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50">
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  {canManageBills && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bills.map((bill) => {
                  const status = effectiveStatus(bill);
                  const isPaid = status === "paid";
                  const isShared = bill.assign_all && !bill.unit_id;
                  return (
                    <tr key={bill.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-black">{bill.name}</p>
                        <p className="mt-0.5 text-xs text-black/45">
                          {SERVICE_LABEL[bill.service_type] || bill.service_type || "Utility"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-black/65">{formatMonth(bill.billing_month)}</td>
                      <td className="px-4 py-3 text-black/65">{billLocationLabel(bill)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-black">
                        {formatCurrency(bill.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-black/65">
                        {formatCurrency(bill.paid_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold capitalize ${
                            statusStyle[status] || statusStyle.unpaid
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-black/55">
                        <p>{formatDate(bill.payment_date)}</p>
                        {bill.reference && <p className="mt-1 font-semibold">{bill.reference}</p>}
                        {isShared && !isPaid && (
                          <p className="mt-1 text-black/40">Shared bill</p>
                        )}
                      </td>
                      {canManageBills && (
                        <td className="px-4 py-3 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Paid
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(bill)}
                              disabled={savingId === bill.id}
                              className="border border-stone-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
                            >
                              {savingId === bill.id ? "Saving..." : "Mark paid"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BillStat({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
