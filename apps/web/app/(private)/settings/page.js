"use client";

import { useEffect, useMemo, useState } from "react";
import SettingsTabs from "./components/SettingsTabs";
import ProfileSettings from "./components/ProfileSettings";
import RolesPermissions from "./components/RolesPermissions";
import TeamMembers from "./components/TeamMembers";
import AccountSettings from "./components/AccountSettings";
import SubscriptionSettings from "./components/SubscriptionSettings";
import SmsBalanceSettings from "./components/SmsBalanceSettings";
import ErrorBoundary from "@/app/_components/ErrorBoundary";
import { useAuth } from "@/app/_context/AuthContext";
import { SETTINGS_TABS, isRouteAllowedForAddons } from "@/app/_lib/routes";

export default function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const isOwner = user?.role === "OWNER";
  const entitlements = user?.entitlements || null;
  const [activeTab, setActiveTab] = useState("profile");

  const visibleTabs = useMemo(
    () =>
      SETTINGS_TABS.filter((tab) => {
        if (tab.hidden) return false;
        if (tab.ownerOnly && !isOwner) return false;
        if (!isRouteAllowedForAddons(tab, entitlements)) return false;
        if (!tab.permission) return true;
        return hasPermission(tab.permission);
      }),
    [entitlements, hasPermission, isOwner],
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "profile");
    }
  }, [activeTab, visibleTabs]);

  const teamPermissions = {
    canInviteUsers: isOwner && hasPermission("users:create"),
    canEditUsers: isOwner && hasPermission("users:edit"),
    canRemoveUsers: isOwner && hasPermission("users:delete"),
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "roles":
        return isOwner && hasPermission("roles:view") ? (
          <RolesPermissions />
        ) : (
          <ProfileSettings />
        );
      case "team":
        return hasPermission("users:view") ? (
          <TeamMembers {...teamPermissions} />
        ) : (
          <ProfileSettings />
        );
      case "account":
        return <AccountSettings />;
      case "subscription":
        return <SubscriptionSettings />;
      case "sms-balance":
        return hasPermission("settings:manage") &&
          isRouteAllowedForAddons({ addon: "sms" }, entitlements) ? (
          <SmsBalanceSettings />
        ) : (
          <ProfileSettings />
        );
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="px-4 pb-4 pt-1 sm:px-6 sm:pb-5 sm:pt-2">
      <header className="mb-4">
        <p className="section-label">— Workspace —</p>
        <h1
          className="mt-1 text-base font-black uppercase tracking-tight text-black sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="mt-1 text-sm text-black/55">
          Manage your account, team, and access.
        </p>
      </header>

      <div className="border border-stone-200 bg-white">
        <SettingsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canViewTab={(tab) =>
            (!tab.ownerOnly || isOwner) &&
            isRouteAllowedForAddons(tab, entitlements) &&
            (!tab.permission || hasPermission(tab.permission))
          }
        />

        <div className="p-5 sm:p-8">
          <ErrorBoundary
            key={activeTab}
            title="Settings Tab Failed"
            message="This settings section ran into an error. Try again or switch tabs."
            showHomeButton={false}
          >
            {renderTabContent()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
