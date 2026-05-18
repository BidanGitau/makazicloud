"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Wrench } from "lucide-react";
import { Maintenance, TenantOverview } from "@/app/_lib/repositories";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";

const OPEN_STATUSES = new Set(["pending", "in_progress"]);
const NOTIFICATION_POLL_MS = 5 * 60 * 1000;

function storageKeyFor(user) {
  return `makazicloud:cleared-maintenance-notifications:${user?.organizationId || "default"}`;
}

function readClearedIds(key) {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeClearedIds(key, ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...ids]));
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function requestLocation(request) {
  return [
    request.properties?.name,
    request.blocks?.name,
    request.units?.unit_number ? `Unit ${request.units.unit_number}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

export default function NotificationsMenu({ user, onOpenMaintenance }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const storageKey = useMemo(() => storageKeyFor(user), [user]);

  const loadNotifications = useCallback(async () => {
    if (!user || user.accountType === ACCOUNT_TYPE.TENANT) return;

    setIsLoading(true);
    try {
      const maintenanceRequests = await Maintenance.getWithDetails();
      let tenants = [];
      try {
        tenants = await TenantOverview.getAll();
      } catch (error) {
        console.warn("Tenant notification names unavailable:", error);
      }

      const tenantsById = new Map(tenants.map((tenant) => [tenant.tenant_id, tenant]));
      const clearedIds = readClearedIds(storageKey);

      const tenantRequests = maintenanceRequests
        .filter((request) => {
          const status = String(request.status || "").toLowerCase();
          return request.tenant_id && OPEN_STATUSES.has(status) && !clearedIds.has(request.id);
        })
        .map((request) => ({
          ...request,
          tenant: tenantsById.get(request.tenant_id) || null,
        }))
        .slice(0, 12);

      setRequests(tenantRequests);
    } catch (error) {
      console.error("Notification fetch error:", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, user]);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, NOTIFICATION_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest(".notifications-menu")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!user || user.accountType === ACCOUNT_TYPE.TENANT) return null;

  const unreadCount = requests.length;
  const hasUnread = unreadCount > 0;

  const handleClearAll = () => {
    const clearedIds = readClearedIds(storageKey);
    requests.forEach((request) => clearedIds.add(request.id));
    writeClearedIds(storageKey, clearedIds);
    setRequests([]);
  };

  const openMaintenance = () => {
    setIsOpen(false);
    onOpenMaintenance?.();
  };

  return (
    <div className="notifications-menu relative">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className={`relative p-2 text-black/55 transition-colors hover:bg-stone-50 hover:text-black ${
          hasUnread ? "notification-bell-shake" : ""
        }`}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Bell
          className={`h-5 w-5 ${hasUnread ? "text-blue-700" : ""}`}
          strokeWidth={1.8}
        />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-blue-700 px-1 text-[10px] font-black leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[21rem] border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">
                Notifications
              </p>
              <p className="text-[11px] text-black/50">
                Tenant maintenance requests
              </p>
            </div>
            {hasUnread && (
              <button
                onClick={handleClearAll}
                className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 hover:text-black"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && requests.length === 0 ? (
              <div className="px-4 py-6 text-[12px] text-black/55">
                Loading notifications...
              </div>
            ) : hasUnread ? (
              requests.map((request) => (
                <button
                  key={request.id}
                  onClick={openMaintenance}
                  className="flex w-full gap-3 border-b border-stone-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-stone-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700">
                    <Wrench className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-black">
                      {request.title || "Maintenance request"}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-black/55">
                      {request.tenant?.full_name || "Tenant"} requested help
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
                      {requestLocation(request) || request.category || "Maintenance"}{" "}
                      {formatDate(request.created_at || request.reported_date)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="flex gap-3 px-4 py-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-stone-100 text-black/45">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[12px] font-bold text-black">Nothing pending</p>
                  <p className="mt-1 text-[11px] text-black/50">
                    New tenant requests will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
