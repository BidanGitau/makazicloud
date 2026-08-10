import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import { exportColumns } from "../utils/financialReportUtils";

export default function FinancialHeader({
  loading,
  hasRows,
  exportData,
  pdfMetadata,
  onRefresh,
  canExport = false,
}) {
  return (
    <header className="flex justify-end">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        {canExport && hasRows && (
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
