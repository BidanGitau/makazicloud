import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

export default function RolesList({
  roles,
  selectedRole,
  isAddingRole,
  newRoleName,
  editingRoleId,
  editRoleName,
  savingRole,
  onSelectRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  setIsAddingRole,
  setNewRoleName,
  setEditingRoleId,
  setEditRoleName,
}) {
  return (
    <div className="border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="section-label">— Roles —</p>
          <h3
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Access Groups
          </h3>
        </div>
        <button
          onClick={() => setIsAddingRole(true)}
          className="p-2 text-blue-700 transition-colors hover:bg-blue-50"
          title="Add role"
        >
          <Plus className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>

      {isAddingRole && (
        <div className="mb-4 border border-stone-200 bg-stone-50 p-3">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Role name"
            className="mb-2 w-full border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            autoFocus
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onCreateRole}
              disabled={savingRole || !newRoleName.trim()}
              className="flex-1 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {savingRole ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setIsAddingRole(false); setNewRoleName(""); }}
              className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`cursor-pointer border p-3 transition-colors ${
              selectedRole?.id === role.id
                ? "border-blue-700 bg-blue-50"
                : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white"
            }`}
            onClick={() => onSelectRole(role)}
          >
            {editingRoleId === role.id ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="flex-1 border border-stone-300 bg-white px-2 py-1 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  autoFocus
                />
                <button
                  onClick={() => onUpdateRole(role.id)}
                  disabled={savingRole}
                  className="p-1 text-green-600 transition-colors hover:bg-green-50"
                  title="Save role"
                >
                  <Check className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => { setEditingRoleId(null); setEditRoleName(""); }}
                  className="p-1 text-black/55 transition-colors hover:bg-stone-100"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-black">{role.name}</span>
                  <p className="mt-1 text-xs text-black/55">
                    {role.permissions?.length || 0} permissions
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingRoleId(role.id); setEditRoleName(role.name); }}
                    className="p-1 text-black/55 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    title="Edit role"
                  >
                    <Edit2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={() => onDeleteRole(role.id)}
                    className="p-1 text-black/55 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {roles.length === 0 && (
          <p className="py-4 text-center text-sm text-black/55">
            No roles yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
