"use client";

import { SETTINGS_TABS } from "@/app/_lib/routes";

export default function SettingsTabs({
  activeTab,
  onTabChange,
  canViewTab,
}) {
  const visibleTabs = SETTINGS_TABS.filter((tab) => {
    if (tab.hidden) return false;
    if (typeof canViewTab === "function") return canViewTab(tab);
    return !tab.permission;
  });

  return (
    <div className="overflow-x-auto border-b border-stone-200">
      <nav
        className="flex min-w-max items-stretch"
        aria-label="Settings tabs"
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-black/45 hover:border-black/15 hover:text-black/70"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <Icon
                className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-black/40 group-hover:text-black/60"}`}
                strokeWidth={1.8}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
