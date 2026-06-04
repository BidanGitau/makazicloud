import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { exportColumns } from "../utils/financialReportUtils";

export default function FinancialHeader({
  loading,
  hasRows,
  exportData,
  pdfMetadata,
  onRefresh,
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="section-label">— Finance —</p>
        <h1
          className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Financial Summary
        </h1>
        <p className="mt-1 text-sm text-black/55">
          Revenue, maintenance, and net income across your portfolio.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        {hasRows && (
          <DownloadPDFButton
            fileName={`financial-summary-${new Date().toISOString().split("T")[0]}.pdf`}
            title="Financial Summary"
            data={exportData}
            columns={exportColumns}
            metadata={pdfMetadata}
            label="Download Report"
          />
        )}
      </div>
    </header>
  );
}
