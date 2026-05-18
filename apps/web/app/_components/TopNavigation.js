"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "@/app/_hooks/navigation";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/app/_context/AuthContext";
import NotificationsMenu from "./NotificationsMenu";

const PAGE_TITLES = {
  "/dashboard": "Dashboard Overview",
  "/propertylisting": "Property Listings",
  "/tenants": "Tenants & Occupancy",
  "/units": "Units & Allocation",
  "/arrears": "Outstanding Rent",
  "/payments": "Payments",
  "/maintenance": "Maintenance",
  "/utility": "Utilities",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getPageTitle = () => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const last = pathname.split("/").filter(Boolean).pop() || "Dashboard";
    return last.replace(/-/g, " ");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest(".profile-dropdown")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
  };

  const initial = user?.firstName?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <p className="section-label">— Workspace —</p>
          <span className="hidden h-4 w-px bg-stone-300 sm:block" />
          <h1
            className="truncate text-base font-black uppercase tracking-tight text-black sm:text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsMenu
            user={user}
            onOpenMaintenance={() => router.push("/maintenance")}
          />

          {user && (
            <div className="profile-dropdown relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-2 py-1.5 transition-colors hover:bg-stone-50"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center bg-blue-700 text-[12px] font-bold uppercase tracking-wider text-white">
                  {initial}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[12px] font-bold text-black">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                    {user?.role || "Manager"}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-black/45" strokeWidth={1.8} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 z-50 mt-1 w-72 border border-stone-200 bg-white shadow-2xl">
                  <div className="border-b border-stone-200 px-5 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center bg-blue-700 text-sm font-bold uppercase text-white">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-black">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="truncate text-[11px] text-black/55">
                          {user?.email}
                        </p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-black/40">
                          {user?.role || "Manager"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push("/settings");
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-stone-50 hover:text-black"
                    >
                      <User className="h-4 w-4" strokeWidth={1.8} />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push("/settings");
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-stone-50 hover:text-black"
                    >
                      <Settings className="h-4 w-4" strokeWidth={1.8} />
                      Account Settings
                    </button>
                  </div>

                  <div className="border-t border-stone-200">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black/65 transition-colors hover:bg-blue-800 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.8} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
