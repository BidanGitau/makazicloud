import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";

export default function DeleteAccountModal({
  deleting,
  deleteConfirmText,
  setDeleteConfirmText,
  onClose,
  onDelete,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-stone-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-stone-200 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-red-600 text-white">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div>
              <p className="section-label">— Danger zone —</p>
              <h3
                className="mt-1 text-xl font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Delete Account
              </h3>
              <p className="mt-1 text-sm text-black/55">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-black/55 transition-colors hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-sm text-black/70">
            Are you sure you want to delete your account? This will:
          </p>
          <ul className="space-y-2 border border-stone-200 bg-stone-50 p-4 text-sm text-black/70">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black/40" />
              Remove all your personal information
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black/40" />
              Delete all your data and settings
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black/40" />
              Cancel any active subscriptions
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black/40" />
              Remove you from all teams
            </li>
          </ul>

          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55"
            >
              Type <span className="text-red-600">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              placeholder="DELETE"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || deleteConfirmText !== "DELETE"}
              className="inline-flex items-center justify-center gap-2 bg-red-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
