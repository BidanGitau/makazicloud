import { Shield, Search, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export default function PermissionsPanel({
  selectedRole,
  filteredGroupedPermissions,
  rolePermissions,
  expandedCategories,
  searchTerm,
  savingPermissions,
  onTogglePermission,
  onToggleCategory,
  onSavePermissions,
  onToggleCategoryExpand,
  setSearchTerm,
}) {
  if (!selectedRole) {
    return (
      <div className="flex flex-col items-center justify-center border border-stone-200 bg-white p-4 py-12 text-black/55 lg:col-span-2">
        <Shield className="mb-4 h-12 w-12 text-black/25" strokeWidth={1.5} />
        <p className="text-sm font-bold uppercase tracking-[0.18em]">
          Select a role to manage its permissions
        </p>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 bg-white p-4 sm:p-5 lg:col-span-2">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-label">— Permissions —</p>
          <h3
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Permissions for {selectedRole.name}
          </h3>
          <p className="mt-1 text-sm text-black/55">
            Select which permissions this role should have
          </p>
        </div>
        <button
          onClick={onSavePermissions}
          disabled={savingPermissions}
          className="inline-flex w-full items-center justify-center gap-2 bg-blue-700 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50 md:w-auto"
        >
          {savingPermissions ? (
            <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> Saving...</>
          ) : (
            <><Check className="h-4 w-4" strokeWidth={1.8} /> Save Permissions</>
          )}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" strokeWidth={1.8} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search permissions..."
          className="w-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        />
      </div>

      <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
        {Object.entries(filteredGroupedPermissions).map(([category, categoryPerms]) => {
          const categoryIds = categoryPerms.map((p) => p.id);
          const selectedCount = categoryIds.filter((id) => rolePermissions.includes(id)).length;
          const allSelected = selectedCount === categoryPerms.length;
          const someSelected = selectedCount > 0 && !allSelected;
          const isExpanded = expandedCategories[category] !== false;

          return (
            <div key={category} className="overflow-hidden border border-stone-200">
              <div
                className="flex cursor-pointer items-start justify-between gap-3 bg-stone-50 p-3 transition-colors hover:bg-white sm:items-center"
                onClick={() => onToggleCategoryExpand(category)}
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleCategory(categoryPerms); }}
                    className={`flex h-5 w-5 items-center justify-center border-2 transition-colors ${
                      allSelected
                        ? "border-blue-700 bg-blue-700"
                        : someSelected
                        ? "border-blue-400 bg-blue-200"
                        : "border-stone-300 bg-white"
                    }`}
                  >
                    {(allSelected || someSelected) && <Check className="h-3 w-3 text-white" strokeWidth={2.2} />}
                  </button>
                  <span className="text-sm font-bold capitalize text-black">{category}</span>
                  <span className="border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
                    {selectedCount}/{categoryPerms.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-black/40" strokeWidth={1.8} />
                ) : (
                  <ChevronRight className="h-5 w-5 text-black/40" strokeWidth={1.8} />
                )}
              </div>

              {isExpanded && (
                <div className="space-y-2 p-3">
                  {categoryPerms.map((permission) => {
                    const isSelected = rolePermissions.includes(permission.id);
                    const [, action] = permission.name.split(":");
                    return (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-3 p-2 transition-colors hover:bg-stone-50"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onTogglePermission(permission.id)}
                          className="h-4 w-4 border-stone-300 text-blue-700 focus:ring-blue-700"
                        />
                        <div>
                          <span className="text-sm font-medium capitalize text-black">
                            {action || permission.name}
                          </span>
                          <p className="font-mono text-xs text-black/45">{permission.name}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(filteredGroupedPermissions).length === 0 && (
          <div className="py-8 text-center text-sm text-black/55">
            {searchTerm ? "No permissions match your search" : "No permissions available"}
          </div>
        )}
      </div>
    </div>
  );
}
