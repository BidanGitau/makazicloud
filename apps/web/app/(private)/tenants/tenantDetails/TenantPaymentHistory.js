"use client";

import { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import { Blocks, Properties, TenantReports } from "@/app/_lib/repositories";
import { getTenantHeaders } from "@/app/_lib/api/client";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import {
  paymentHistoryColumns,
  calculatePaymentSummary,
} from "./PaymentHistoryColumns";

export default function TenantPaymentHistory({
  tenantId,
  tenant,
  unit,
  canExport = false,
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [statementDownloading, setStatementDownloading] = useState(false);
  const [location, setLocation] = useState({ propertyName: "", blockName: "" });


  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });


  useEffect(() => {
    if (!tenantId || !startDate || !endDate) return;

    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const historyData = await TenantReports.getHistory(
          tenantId,
          startDate,
          endDate,
        );
        setPayments(historyData.payments || []);
      } catch (err) {
        setError(err.message || "Failed to load payment history");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [tenantId, startDate, endDate]);

  useEffect(() => {
    const propertyId = unit?.property_id;
    const blockId = unit?.block_id;
    if (!propertyId && !blockId) {
      setLocation({ propertyName: "", blockName: "" });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [property, block] = await Promise.all([
          propertyId ? Properties.getById(propertyId) : Promise.resolve(null),
          blockId ? Blocks.getById(blockId) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setLocation({
            propertyName: property?.name || "",
            blockName: block?.name || "",
          });
        }
      } catch (err) {
        console.warn("Failed to load tenant payment location", err);
        if (!cancelled) setLocation({ propertyName: "", blockName: "" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [unit?.property_id, unit?.block_id]);

  const monthlyRent = Number(unit?.rent_amount ?? tenant?.rent_amount ?? 0);


  const summary = useMemo(
    () => calculatePaymentSummary(payments, monthlyRent, startDate, endDate),
    [payments, monthlyRent, startDate, endDate],
  );

  const billingCycle = useMemo(() => {
    const cycleMonths = tenant?.billing_cycle_enabled
      ? Math.max(1, Number(tenant.billing_cycle_months) || 1)
      : 1;
    const cycleLabel = !tenant?.billing_cycle_enabled
      ? "Monthly"
      : ({
          2: "Bi-monthly",
          3: "Quarterly",
          6: "Bi-annual",
          12: "Annual",
        }[cycleMonths] ?? `Every ${cycleMonths} months`);

    return {
      cycleMonths,
      cycleLabel,
      isNonMonthly: cycleMonths > 1,
      rentPerCycle: monthlyRent * cycleMonths,
    };
  }, [tenant, monthlyRent]);

  const { cycleMonths, cycleLabel, isNonMonthly, rentPerCycle } = billingCycle;

  const handleDownloadInvoice = async () => {
    try {
      setInvoiceDownloading(true);
      await downloadPdfDocument("invoice");
    } catch (err) {
      setError(err.message || "Failed to download invoice");
    } finally {
      setInvoiceDownloading(false);
    }
  };

  const downloadPdfDocument = async (type, { month } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    const query = params.toString();
    const res = await fetch(
      `/documents/tenants/${tenantId}/${type}${query ? `?${query}` : ""}`,
      {
        headers: getTenantHeaders(),
        credentials: "include",
      },
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || `Failed to generate ${type}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const fileName = match ? match[1] : `${type}-${tenantId}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadStatement = async () => {
    try {
      setStatementDownloading(true);
      const statementMonth = endDate ? endDate.slice(0, 7) : undefined;
      await downloadPdfDocument("statement", { month: statementMonth });
    } catch (err) {
      setError(err.message || "Failed to download statement");
    } finally {
      setStatementDownloading(false);
    }
  };

  const tableData = useMemo(() => {
    if (!payments.length) return [];

    return [
      ...payments,
      {
        is_summary: true,
        payment_date: null,
        reference: `${summary.monthsInRange || 0} month(s)`,
        method: `${summary.totalPayments || 0} payment(s)`,
        amount: Number(summary.totalAmount || 0),
      },
    ];
  }, [payments, summary]);

  return (
    <div className="space-y-4">

      <header className="border border-stone-200 bg-white px-4 py-3">
        <p className="section-label">— Tenant Payment Report —</p>
        <h2
          className="mt-1 text-xl font-black uppercase tracking-tight text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Payment History
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Filter by date range and review tenant payment activity.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 text-sm lg:grid-cols-4">
        <HistoryFact label="Tenant" value={tenant?.full_name || "-"} />
        <HistoryFact
          label="Property"
          value={[
            location.propertyName,
            location.blockName ? `Block ${location.blockName}` : "",
          ].filter(Boolean).join(" · ") || "-"}
        />
        <HistoryFact label="Unit" value={unit?.unit_number || "-"} />
        <HistoryFact
          label="Monthly Rent"
          value={`KSh ${monthlyRent.toLocaleString()}`}
        />
      </div>


      {isNonMonthly && (
        <div className="flex items-start gap-3 border-l-2 border-blue-700 bg-blue-50 p-4 text-sm text-black/80">
          <span>
            This tenant is billed{" "}
            <strong className="font-bold text-black">
              {cycleLabel.toLowerCase()}
            </strong>{" "}
            — KSh {rentPerCycle.toLocaleString()} every {cycleMonths} months.
            Arrears only appear on billing dates.
          </span>
        </div>
      )}


      <div className="border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="payment-start-date"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55"
            >
              Start Date
            </label>
            <input
              id="payment-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="payment-end-date"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55"
            >
              End Date
            </label>
            <input
              id="payment-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          {canExport && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadStatement}
                disabled={statementDownloading}
                className="bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80 disabled:opacity-50"
              >
                {statementDownloading ? "Generating..." : "Download Statement"}
              </button>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={invoiceDownloading}
                className="bg-blue-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {invoiceDownloading
                  ? "Generating..."
                  : `Download Invoice (${cycleLabel})`}
              </button>
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
          Showing {new Date(startDate).toLocaleDateString()} →{" "}
          {new Date(endDate).toLocaleDateString()} · {payments.length} payment
          {payments.length === 1 ? "" : "s"}
        </p>
      </div>


      {error && (
        <div className="flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}


      <div className="border border-stone-200 bg-white">
        <DataTable
          columns={paymentHistoryColumns}
          data={tableData}
          progressPending={loading}
          noDataComponent={
            <div className="py-10 text-center">
              <p className="section-label">— Empty —</p>
              <p className="mt-2 text-sm font-bold text-black">
                No payments in this date range
              </p>
              <p className="mt-1 text-sm text-black/55">
                Try selecting a different range.
              </p>
            </div>
          }
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 25, 50]}
          striped
          highlightOnHover
          dense
          customStyles={editorialTableStyles}
          conditionalRowStyles={[
            {
              when: (row) => row.is_summary,
              style: {
                backgroundColor: "#eff6ff",
                fontWeight: 700,
                borderTop: "2px solid #1d4ed8",
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

function HistoryFact({ label, value }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-black">{value}</p>
    </div>
  );
}
