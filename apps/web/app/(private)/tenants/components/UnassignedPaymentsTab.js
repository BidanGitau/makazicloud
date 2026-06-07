"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/_lib/api/client";
import { Tenants } from "@/app/_lib/repositories";
import { showToast } from "@/app/_components/CustomToast";

export default function UnassignedPaymentsTab({ canAssign = false }) {
  const [rows, setRows] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [payments, tenantRows] = await Promise.all([
        apiFetch("/mpesa/unassigned"),
        Tenants.getOverview(),
      ]);
      setRows(payments || []);
      setTenants(tenantRows || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load unassigned payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tenantOptions = useMemo(
    () =>
      tenants.map((tenant) => ({
        id: tenant.tenant_id,
        label: `${tenant.full_name}${tenant.unit_number ? ` - ${tenant.unit_number}` : ""}${
          tenant.property_name ? `, ${tenant.property_name}` : ""
        }`,
      })),
    [tenants],
  );

  const assign = async (transactionId) => {
    const tenantId = assignments[transactionId];
    if (!tenantId) {
      showToast.error("Choose a tenant first");
      return;
    }
    setAssigningId(transactionId);
    try {
      await apiFetch(`/mpesa/transactions/${transactionId}/assign`, {
        method: "POST",
        body: { tenantId },
      });
      showToast.success("Payment assigned");
      await load();
    } catch (err) {
      showToast.error(err?.message || "Failed to assign payment");
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse border border-stone-200 bg-white" />;
  }

  return (
    <section className="border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <p className="section-label">— M-Pesa —</p>
        <h2
          className="mt-1 text-base font-black uppercase tracking-tight text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Unassigned payments
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Payments whose PayBill account number did not match exactly one active
          tenant unit.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-black/55">
          No unassigned M-Pesa payments.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-black/45">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Assign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {row.trans_id}
                  </td>
                  <td className="px-4 py-3">{row.bill_ref_number || "-"}</td>
                  <td className="px-4 py-3">
                    KSh {Number(row.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.phone_number || "-"}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-black/55">
                    {row.match_reason || row.status}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-72 gap-2">
                      <select
                        value={assignments[row.id] || ""}
                        onChange={(event) =>
                          setAssignments((prev) => ({
                            ...prev,
                            [row.id]: event.target.value,
                          }))
                        }
                        disabled={!canAssign}
                        className="h-10 flex-1 border border-stone-300 px-2 text-xs outline-none focus:border-blue-700 disabled:opacity-50"
                      >
                        <option value="">Choose tenant</option>
                        {tenantOptions.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => assign(row.id)}
                        disabled={!canAssign || assigningId === row.id}
                        className="bg-blue-700 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white disabled:opacity-50"
                      >
                        {assigningId === row.id ? "..." : "Assign"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
