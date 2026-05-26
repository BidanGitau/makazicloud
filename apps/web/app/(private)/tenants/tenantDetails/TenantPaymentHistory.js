"use client";

import { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import { Blocks, Properties, TenantReports } from "@/app/_lib/repositories";
import { getTenantHeaders } from "@/app/_lib/api/client";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { editorialTableStyles } from "@/app/_components/tableStyles";
import {
  paymentHistoryColumns,
  pdfExportColumns,
  calculatePaymentSummary,
  generatePDFFilename,
  formatPaymentsForPDF,
  generatePDFMetadata,
} from "./PaymentHistoryColumns";

export default function TenantPaymentHistory({ tenantId, tenant, unit }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
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


  const tenantInfo = useMemo(() => {
    return {
      full_name: tenant?.full_name,
      property_name: location.propertyName,
      block_name: location.blockName,
      unit_number: unit?.unit_number || "",
      rent_amount: monthlyRent,
      billing_cycle_enabled: tenant?.billing_cycle_enabled,
      billing_cycle_months: tenant?.billing_cycle_months,
    };
  }, [tenant, unit, location, monthlyRent]);


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
      const res = await fetch(`/documents/tenants/${tenantId}/invoice`, {
        headers: getTenantHeaders(),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to generate invoice");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match ? match[1] : `invoice-${tenantId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download invoice");
    } finally {
      setInvoiceDownloading(false);
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
    <div className="space-y-5">

      <header>
        <p className="section-label">— Tenant Payment Report —</p>
        <h2
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Payment History
        </h2>
        <p className="mt-1 text-sm text-black/55">
          Filter by date range, export a PDF report, or download an invoice.
        </p>
      </header>


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


      <div className="border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
          <span className="h-1 w-6 bg-blue-700" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Filter Range
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4">
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
                className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
                className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {payments.length > 0 ? (
                <DownloadPDFButton
                  fileName={generatePDFFilename(tenantInfo, startDate, endDate)}
                  title="Tenant Payment Report"
                  data={formatPaymentsForPDF(payments, summary)}
                  columns={pdfExportColumns}
                  metadata={generatePDFMetadata(
                    tenantInfo,
                    startDate,
                    endDate,
                    summary,
                  )}
                  label="Download Report"
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="border border-stone-300 bg-stone-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black/40"
                >
                  No Data to Download
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={invoiceDownloading}
                className="bg-blue-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {invoiceDownloading
                  ? "Generating…"
                  : `Download Invoice (${cycleLabel})`}
              </button>
            </div>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
            Showing {new Date(startDate).toLocaleDateString()} →{" "}
            {new Date(endDate).toLocaleDateString()} · {payments.length} payment
            {payments.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>


      {error && (
        <div className="flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}


      <div>
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
