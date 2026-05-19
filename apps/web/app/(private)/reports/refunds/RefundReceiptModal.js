"use client";

import { useMemo } from "react";
import ModalSlider from "@/app/_components/ModalSlider";
import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { formatCurrency } from "@/app/_lib/formatters";

const receiptColumns = [
  { header: "Item", key: "item", width: "55%" },
  { header: "Detail", key: "detail", width: "20%" },
  { header: "Amount (KSh)", key: "amount", type: "currency", width: "25%" },
];

export default function RefundReceiptModal({ receipt, onClose }) {
  const open = Boolean(receipt);

  const rows = useMemo(() => {
    if (!receipt) return [];
    const out = [
      { item: "Deposit on file", detail: "", amount: Number(receipt.total_deposit || 0) },
    ];
    (receipt.arrears_items || []).forEach((a) => {
      out.push({
        item: `Arrears — ${a.month || "—"}`,
        detail: a.status || "",
        amount: Number(a.balance || 0),
      });
    });
    if (Number(receipt.fault_deductions || 0) > 0) {
      out.push({
        item: "Repairs (tenant fault)",
        detail: "",
        amount: Number(receipt.fault_deductions || 0),
      });
    }
    out.push({
      item: "Total deductions",
      detail: "",
      amount: Number(receipt.deductions || 0),
    });
    out.push({
      item: "Net refund paid",
      detail: "",
      amount: Number(receipt.net_refund || 0),
    });
    return out;
  }, [receipt]);

  const metadata = useMemo(() => {
    if (!receipt) return {};
    return {
      Tenant: receipt.tenant_name || "—",
      Property: receipt.property_name || "—",
      Unit: receipt.unit_number ? `Unit ${receipt.unit_number}` : "—",
      "Lease End": receipt.lease_end_date || "—",
      Deposit: formatCurrency(receipt.total_deposit),
      "Arrears Deducted": formatCurrency(receipt.arrears_deductions),
      "Repairs Deducted": formatCurrency(receipt.fault_deductions),
      "Total Deductions": formatCurrency(receipt.deductions),
      "Net Refund": formatCurrency(receipt.net_refund),
      Processed: new Date(receipt.processed_at || Date.now()).toLocaleString("en-KE"),
    };
  }, [receipt]);

  if (!receipt) return null;

  const fileName = `refund-${(receipt.tenant_name || "tenant")
    .toLowerCase()
    .replace(/\s+/g, "-")}-${(receipt.processed_at || "").split("T")[0] || "today"}`;

  const hasArrears = (receipt.arrears_items || []).length > 0;
  const hasRepairs = Number(receipt.fault_deductions || 0) > 0;

  return (
    <ModalSlider isOpen={open} onClose={onClose} title="Refund Receipt">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
            Tenant
          </p>
          <p
            className="mt-1 text-xl font-black text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {receipt.tenant_name || "—"}
          </p>
          <p className="text-sm text-black/55">
            {receipt.property_name || "—"}
            {receipt.unit_number ? ` · Unit ${receipt.unit_number}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-4">
          {[
            { label: "Deposit", value: formatCurrency(receipt.total_deposit) },
            {
              label: "Arrears",
              value: formatCurrency(receipt.arrears_deductions),
              accent: "text-amber-700",
            },
            {
              label: "Repairs",
              value: formatCurrency(receipt.fault_deductions),
              accent: "text-amber-700",
            },
            {
              label: "Net Refund",
              value: formatCurrency(receipt.net_refund),
              accent: "text-green-700",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                {card.label}
              </p>
              <p
                className={`mt-1 text-base font-black tabular-nums ${
                  card.accent || "text-black"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="section-label">— Breakdown —</p>
          <div className="mt-2 border border-stone-200">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black/55 border-b border-stone-200 bg-stone-50">
              <span>Item</span>
              <span className="text-right">Amount</span>
            </div>

            <Row label="Deposit on file" value={receipt.total_deposit} bold />

            {hasArrears && (
              <>
                <SectionLabel>Arrears</SectionLabel>
                {receipt.arrears_items.map((a) => (
                  <Row
                    key={a.id}
                    label={a.month || "—"}
                    sub={a.status}
                    value={a.balance}
                    deduct
                  />
                ))}
                <Row
                  label="Arrears subtotal"
                  value={receipt.arrears_deductions}
                  deduct
                  bold
                />
              </>
            )}

            {hasRepairs && (
              <>
                <SectionLabel>Repairs</SectionLabel>
                <Row
                  label="Tenant-fault maintenance"
                  value={receipt.fault_deductions}
                  deduct
                />
              </>
            )}

            {!hasArrears && !hasRepairs && (
              <div className="px-4 py-3 text-sm text-black/55">
                No deductions applied.
              </div>
            )}

            <Row
              label="Total deductions"
              value={receipt.deductions}
              deduct
              bold
              className="border-t border-stone-200"
            />
            <Row
              label="Net refund paid"
              value={receipt.net_refund}
              bold
              accent="text-green-700"
              className="border-t border-stone-200 bg-stone-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
          >
            Close
          </button>
          <DownloadPDFButton
            fileName={fileName}
            title="Refund Receipt"
            data={rows}
            columns={receiptColumns}
            metadata={metadata}
            label="Download Receipt"
          />
        </div>
      </div>
    </ModalSlider>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45 border-t border-stone-200 bg-stone-50/60">
      {children}
    </div>
  );
}

function Row({ label, sub, value, deduct, bold, accent, className = "" }) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-x-6 px-4 py-2.5 text-sm ${className}`}
    >
      <div>
        <div className={bold ? "font-bold text-black" : "text-black/80"}>
          {label}
        </div>
        {sub && (
          <div className="text-[10px] uppercase tracking-[0.16em] text-black/45">
            {sub}
          </div>
        )}
      </div>
      <div
        className={`text-right tabular-nums ${bold ? "font-bold" : ""} ${
          accent || (deduct ? "text-amber-700" : "text-black")
        }`}
      >
        {deduct ? "− " : ""}
        {formatCurrency(value)}
      </div>
    </div>
  );
}
