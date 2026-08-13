import { Mail, Send } from "lucide-react";

export default function ArrearsHeader({
  selectedCount,
  loading,
  onBulkEmail,
  onBulkSms,
  onSmsAll,
  onRefresh,
}) {
  return (
    <header className="flex justify-end">
      <div className="flex flex-wrap gap-2">
        {selectedCount > 0 && (onBulkEmail || onBulkSms) && (
          <>
            {onBulkEmail && (
              <button
                type="button"
                onClick={onBulkEmail}
                className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                <Mail size={14} strokeWidth={1.8} />
                Email ({selectedCount})
              </button>
            )}
            {onBulkSms && (
              <button
                type="button"
                onClick={onBulkSms}
                className="inline-flex items-center gap-2 border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-colors hover:bg-blue-50"
              >
                <Send size={14} strokeWidth={1.8} />
                SMS ({selectedCount})
              </button>
            )}
          </>
        )}
        {onSmsAll && (
          <button
            type="button"
            onClick={onSmsAll}
            className="inline-flex items-center gap-1.5 border border-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:bg-blue-50"
          >
            <Send size={14} strokeWidth={1.8} />
            Send all SMS
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}
