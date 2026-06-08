"use client";

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

export default function QuickAccessBar() {
  const router = useRouter();
  const { permissions } = useAuth();
  const permissionSet = new Set(permissions || []);
  const visibleActions = QUICK_ACTIONS.filter((action) =>
    permissionSet.has(action.permission),
  );

  if (!visibleActions.length) return null;

  return (
    <div className="scrollbar-hide flex-shrink-0 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 lg:px-6">
      <div className="flex min-w-max items-center gap-2 py-2.5">
        <p className="section-label mr-2 flex-shrink-0">— Quick Add —</p>
        {visibleActions.map(({ label, icon: Icon, href }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/70 transition-colors hover:border-blue-700 hover:text-black"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
