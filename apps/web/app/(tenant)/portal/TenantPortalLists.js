"use client";

import { useMemo, useState } from "react";
import { dateText, money } from "./portal-formatters";
import { Section } from "./portal-ui";

const TABS = [
  { id: "payments", label: "Payment History" },
  { id: "arrears", label: "Arrears / Advances" },
  { id: "maintenance", label: "Maintenance" },
];

export default function TenantPortalLists({ payments, arrears, maintenance }) {
  const [activeTab, setActiveTab] = useState("payments");
  const advanceRows = useMemo(
    () => arrears.filter((row) => Number(row.balance || 0) < 0),
    [arrears],
  );

  return (
    <main className="space-y-4">
      <div className="flex overflow-x-auto border border-stone-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-r border-stone-200 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
              activeTab === tab.id
                ? "bg-blue-700 text-white"
                : "text-black/55 hover:bg-stone-50 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "payments" && <PaymentsTable payments={payments} />}
      {activeTab === "arrears" && (
        <ArrearsTable arrears={arrears} advanceCount={advanceRows.length} />
      )}
      {activeTab === "maintenance" && (
        <MaintenanceTable maintenance={maintenance} />
      )}
    </main>
  );
}

function PaymentsTable({ payments }) {
  return (
    <Section title="Payment History">
      <Table
        empty="No payments recorded yet."
        columns={["Date", "Amount", "Method", "Reference"]}
        rows={payments.map((payment) => ({
          key: payment.id,
          cells: [
            dateText(payment.paymentDate),
            money(payment.amount),
            payment.method || "-",
            payment.reference || "-",
          ],
        }))}
      />
    </Section>
  );
}

function ArrearsTable({ arrears, advanceCount }) {
  return (
    <Section title="Arrears / Advances">
      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
        <span>{arrears.length} months</span>
        <span>·</span>
        <span>{advanceCount} advance rows</span>
      </div>
      <Table
        empty="No arrears or advance rows recorded yet."
        columns={["Month", "Due", "Paid", "Balance", "Status"]}
        rows={arrears.map((row) => {
          const balance = Number(row.balance || 0);
          return {
            key: row.id,
            tone: balance > 0 ? "red" : balance < 0 ? "blue" : "green",
            cells: [
              dateText(row.month),
              money(row.amountDue),
              money(row.amountPaid),
              money(balance),
              row.status || "-",
            ],
          };
        })}
      />
    </Section>
  );
}

function MaintenanceTable({ maintenance }) {
  return (
    <Section title="Maintenance">
      <Table
        empty="No maintenance requests yet."
        columns={["Reported", "Title", "Category", "Priority", "Status"]}
        rows={maintenance.map((request) => ({
          key: request.id,
          cells: [
            dateText(request.reportedDate || request.createdAt),
            request.title || "-",
            request.category || "general",
            request.priority || "-",
            request.status || "-",
          ],
        }))}
      />
    </Section>
  );
}

function Table({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div className="border border-stone-200 bg-stone-50 p-4 text-sm text-black/50">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-stone-200">
      <table className="min-w-full border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            {columns.map((column) => (
              <th
                key={column}
                className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-stone-50">
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.key}-${index}`}
                  className={`px-3 py-3 ${
                    index === 0 ? "text-black/55" : "text-black"
                  } ${
                    row.tone && index === 3
                      ? toneClass(row.tone)
                      : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toneClass(tone) {
  if (tone === "red") return "font-semibold text-red-700";
  if (tone === "blue") return "font-semibold text-blue-700";
  if (tone === "green") return "font-semibold text-green-700";
  return "";
}
