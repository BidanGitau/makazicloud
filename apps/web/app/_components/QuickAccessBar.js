"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/app/_hooks/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import { Building2, Grid, UserCheck, Wrench, Plus } from "lucide-react";

const QUICK_ACTIONS = [
  {
    label: "New Property",
    icon: Building2,
    href: "/propertylisting?new=true",
    permission: "properties:create",
  },
  { label: "New Unit", icon: Grid, href: "/units?new=true", permission: "units:create" },
  {
    label: "New Tenant",
    icon: UserCheck,
    href: "/tenants?new=true",
    permission: "tenants:create",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/maintenance?new=true",
    permission: "maintenance:create",
  },
];

// Quick Create dropdown shown in the top navigation, next to Support.
export default function QuickAccessBar() {
  const router = useRouter();
  const { permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const permissionSet = new Set(permissions || []);
  const visibleActions = QUICK_ACTIONS.filter((action) =>
    permissionSet.has(action.permission),
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest(".quick-create-menu")) setIsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!visibleActions.length) return null;

  return (
    <div className="quick-create-menu relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap bg-blue-700 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-800"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Quick create"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        <span className="hidden sm:inline">Quick Create</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[190px] border border-stone-200 bg-white py-1 shadow-2xl"
        >
          {visibleActions.map(({ label, icon: Icon, href }) => (
            <button
              key={href}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                router.push(href);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-black/75 transition-colors hover:bg-stone-50 hover:text-black"
            >
              <Icon className="h-4 w-4 text-black/55" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
