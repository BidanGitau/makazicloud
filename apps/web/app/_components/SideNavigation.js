"use client";

import { useState, useEffect } from "react";
import Link from "@/app/_components/AppLink";
import { usePathname } from "@/app/_hooks/navigation";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "@/app/_context/AuthContext";
import {
  NAV_ITEMS,
  FOOTER_NAV_ITEMS,
  NAV_CATEGORIES,
  filterNavItemsByAccess,
  getNavItemsByCategory,
  isRouteActive,
} from "@/app/_lib/routes";

export default function SideNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const pathname = usePathname();
  const { user, permissions } = useAuth();
  const planId = user?.subscription?.planId || "free";

  useEffect(() => {
    setIsMobileExpanded(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileExpanded(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleNavItems = filterNavItemsByAccess(NAV_ITEMS, permissions, planId);
  const visibleFooterItems = filterNavItemsByAccess(
    FOOTER_NAV_ITEMS,
    permissions,
    planId,
  );
  const categorizedItems = getNavItemsByCategory(visibleNavItems);

  return (
    <>
      {isMobileExpanded && (
        <div
          className="fixed inset-0 z-40 bg-blue-900/40 lg:hidden"
          onClick={() => setIsMobileExpanded(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-stone-200 bg-white transition-all duration-200 ease-in-out lg:relative ${
          isMobileExpanded ? "w-64 shadow-xl" : "w-16"
        } ${isCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >

        <div className="flex-shrink-0 border-b border-stone-200 px-3 py-5">
          <div className="flex items-center justify-between">
            <div className="hidden min-w-0 lg:block">
              <Logo compact={isCollapsed} />
            </div>
            {isMobileExpanded && (
              <div className="lg:hidden">
                <Logo />
              </div>
            )}

            <button
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="mx-auto inline-flex items-center justify-center p-2 text-black/55 transition-colors hover:bg-stone-50 hover:text-black lg:hidden"
              aria-label={isMobileExpanded ? "Collapse menu" : "Expand menu"}
            >
              {isMobileExpanded ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden p-2 text-black/55 transition-colors hover:bg-stone-50 hover:text-black lg:flex"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto py-5">
          {Object.entries(categorizedItems).map(([category, items]) => (
            <NavCategory
              key={category}
              label={NAV_CATEGORIES[category]}
              items={items}
              pathname={pathname}
              isCollapsed={isCollapsed}
              isMobileExpanded={isMobileExpanded}
            />
          ))}
        </div>


        <div className="flex-shrink-0 space-y-1 border-t border-stone-200 px-2 py-4">
          {visibleFooterItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isRouteActive(pathname, item)}
              isCollapsed={isCollapsed}
              isMobileExpanded={isMobileExpanded}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavCategory({ label, items, pathname, isCollapsed, isMobileExpanded }) {
  return (
    <div className="mb-6">
      <p
        className={`section-label mb-3 px-5 ${
          isMobileExpanded ? "block lg:hidden" : "hidden"
        } ${!isCollapsed ? "lg:block" : "lg:hidden"}`}
      >
        — {label} —
      </p>
      <div className="space-y-px px-2">
        {items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isRouteActive(pathname, item)}
            isCollapsed={isCollapsed}
            isMobileExpanded={isMobileExpanded}
          />
        ))}
      </div>
    </div>
  );
}

function NavItem({ item, isActive, isCollapsed, isMobileExpanded }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
        isActive
          ? "bg-blue-700 text-white"
          : "text-black/55 hover:bg-stone-50 hover:text-black"
      } ${!isMobileExpanded ? "justify-center lg:justify-start" : "justify-start"} ${
        isCollapsed ? "lg:justify-center" : "lg:justify-start"
      }`}
      title={!isMobileExpanded ? item.label : undefined}
    >
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          isActive ? "text-white" : "text-black/45 group-hover:text-black"
        }`}
        strokeWidth={1.8}
      />

      <span
        className={`truncate ${isMobileExpanded ? "inline lg:hidden" : "hidden"} ${
          !isCollapsed ? "lg:inline" : "lg:hidden"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}
