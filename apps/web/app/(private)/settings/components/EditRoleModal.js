import { X, Loader2 } from "lucide-react";

export default function EditRoleModal({
  editingMember,
  roles,
  editRoleId,
  setEditRoleId,
  saving,
  onClose,
  onSave,
}) {
  const initial =
    editingMember?.full_name?.[0]?.toUpperCase() ||
    editingMember?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-stone-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 p-5 sm:p-6">
          <div>
            <p className="section-label">— Team —</p>
            <h3
              className="mt-1 text-xl font-black uppercase tracking-tight text-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Change Role
            </h3>
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

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex items-center gap-4 border border-stone-200 bg-stone-50 p-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-blue-700 text-lg font-black text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-black">
                {editingMember.full_name || "Unnamed user"}
              </p>
              <p className="break-all text-sm text-black/55">
                {editingMember.email}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-role-select"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-black/55"
            >
              Assign role
            </label>
            <select
              id="edit-role-select"
              value={editRoleId}
              onChange={(e) => setEditRoleId(e.target.value)}
              className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
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
              onClick={onSave}
              disabled={saving || !editRoleId}
              className="inline-flex items-center justify-center gap-2 bg-blue-700 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  Saving…
                </>
              ) : (
                "Update Role"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
