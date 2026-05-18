"use client";

import { useEffect, useMemo, useState } from "react";
import SettingsTabs from "./components/SettingsTabs";
import ProfileSettings from "./components/ProfileSettings";
import RolesPermissions from "./components/RolesPermissions";
import TeamMembers from "./components/TeamMembers";
import AccountSettings from "./components/AccountSettings";
import SubscriptionSettings from "./components/SubscriptionSettings";
import ErrorBoundary from "@/app/_components/ErrorBoundary";
import { useAuth } from "@/app/_context/AuthContext";
import { SETTINGS_TABS } from "@/app/_lib/routes";

export default function SettingsPage() {
  const { permissions, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const visibleTabs = useMemo(
    () =>
      SETTINGS_TABS.filter((tab) => {
        if (tab.hidden) return false;
        if (!tab.permission) return true;
        return permissions.includes(tab.permission);
      }),
    [permissions],
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "profile");
    }
  }, [activeTab, visibleTabs]);

  // Synchronous from the JWT — no fetch.
  const teamPermissions = {
    canInviteUsers: hasPermission("users:create"),
    canEditUsers: hasPermission("users:edit"),
    canRemoveUsers: hasPermission("users:delete"),
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "roles":
        return hasPermission("roles:view") ? <RolesPermissions /> : <ProfileSettings />;
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
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8">
        <p className="section-label">— Workspace —</p>
        <h1
          className="mt-2 text-3xl font-black uppercase tracking-tight text-black sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="mt-2 text-sm text-black/55">
          Manage your account, team, and access.
        </p>
      </header>

      <div className="border border-stone-200 bg-white">
        <SettingsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userPermissions={permissions}
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
