"use client";

import { useEffect } from "react";
import { useRouter } from "@/app/_hooks/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import { ACCOUNT_TYPE } from "@/app/_lib/account-types";
import MaintenanceRequestForm from "./MaintenanceRequestForm";
import PasswordUpdateForm from "./PasswordUpdateForm";
import { PortalCard } from "./portal-ui";
import TenantPortalLists from "./TenantPortalLists";
import { money } from "./portal-formatters";
import { useTenantPortal } from "./useTenantPortal";

export default function TenantPortalPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { portal, outstanding, refresh } = useTenantPortal(user);
  const profile = portal.profile;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.accountType !== ACCOUNT_TYPE.TENANT) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (loading || !user || user.accountType !== ACCOUNT_TYPE.TENANT) return null;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <header className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">— Tenant Portal —</p>
            <h1
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {profile?.fullName || user.fullName || user.email}
            </h1>
            <p className="mt-1 text-sm text-black/55">
              {formatTenantLocation(profile)}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="self-start border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50 sm:self-auto"
          >
            Sign out
          </button>
        </header>


        <div className="grid gap-px border border-stone-200 bg-stone-200 sm:grid-cols-4">
          <PortalCard title="Rent" value={money(profile?.rentAmount)} />
          <PortalCard
            title="Outstanding"
            value={money(outstanding)}
            tone={outstanding > 0 ? "red" : "blue"}
          />
          <PortalCard title="Payments" value={portal.payments.length} />
          <PortalCard title="Requests" value={portal.maintenance.length} />
        </div>

        {portal.loading ? (
          <div className="border border-stone-200 bg-white p-5 text-sm text-black/55">
            Loading your portal…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <TenantPortalLists
              payments={portal.payments}
              arrears={portal.arrears}
              maintenance={portal.maintenance}
            />

            <aside className="space-y-6">
              <MaintenanceRequestForm onCreated={refresh} />
              <PasswordUpdateForm />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTenantLocation(profile) {
  if (!profile?.unit) return "Your tenant account";

  return [
    profile.unit.propertyName || "Property",
    profile.unit.blockName,
    profile.unit.unitNumber ? `Unit ${profile.unit.unitNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
