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
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const load = async (search = query) => {
    setLoading(true);
    try {
      const q = String(search || "").trim();
      const [nextPayments, nextTenants] = await Promise.all([
        apiFetch(`/mpesa/unassigned${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        Tenants.getOverview(),
      ]);
      setRows(nextPayments || []);
      setTenants(nextTenants || []);
    } catch (err) {
      showToast.error(err?.message || "Failed to load unassigned payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenantOptions = useMemo(() => {
    const unitQ = unitFilter.trim().toLowerCase();
    return tenants
      .map((tenant) => ({
        id: tenant.tenant_id,
        unit: String(tenant.unit_number || "").toLowerCase(),
        property: String(tenant.property_name || "").toLowerCase(),
        label: `${tenant.full_name}${tenant.unit_number ? ` - ${tenant.unit_number}` : ""}${
          tenant.property_name ? `, ${tenant.property_name}` : ""
        }`,
      }))
      .filter((tenant) => {
        if (!unitQ) return true;
        return tenant.unit.includes(unitQ) || tenant.property.includes(unitQ);
      });
  }, [tenants, unitFilter]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.trans_id,
        row.bill_ref_number,
        row.normalized_account,
        row.phone_number,
        row.raw_sms,
        row.match_reason,
        row.amount,
        row.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

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
      await load(query);
    } catch (err) {
      showToast.error(err?.message || "Failed to assign payment");
    } finally {
      setAssigningId(null);
    }
  };

  const search = (event) => {
    event.preventDefault();
    load(query);
  };

  if (loading && rows.length === 0) {
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
          Search a forwarded SMS by receipt, phone, or house number after #, then
          type the property / unit to reconcile it to a tenant.
        </p>
        <form onSubmit={search} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search message, receipt, phone, 347086#m6..."
            className="h-10 flex-1 border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
          />
          <input
            value={unitFilter}
            onChange={(event) => setUnitFilter(event.target.value)}
            placeholder="Filter tenants by unit / property"
            className="h-10 flex-1 border border-stone-300 px-3 text-sm outline-none focus:border-blue-700"
          />
          <button
            type="submit"
            className="h-10 bg-blue-700 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
          >
            Search
          </button>
        </form>
      </div>

      {visibleRows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-black/55">
          No unassigned M-Pesa payments.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-black/45">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Account / unit</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Assign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {row.trans_id}
                    <div className="mt-1 text-[10px] font-normal uppercase tracking-[0.14em] text-black/40">
                      {row.source === "sms_gateway" ? "SMS" : "C2B"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.bill_ref_number || "-"}</div>
                    {row.normalized_account ? (
                      <div className="text-xs text-black/45">
                        Unit {String(row.normalized_account).toUpperCase()}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    KSh {Number(row.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.phone_number || "-"}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-black/55">
                    {row.raw_sms || row.match_reason || row.status}
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
                        <option value="">
                          {unitFilter
                            ? `Choose tenant (${tenantOptions.length})`
                            : "Choose tenant"}
                        </option>
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
