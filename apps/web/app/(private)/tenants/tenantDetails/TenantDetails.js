"use client";

import { useState, useEffect } from "react";
import { Tenants, Units } from "@/app/_lib/repositories";
import TenantForm from "../TenantForm";
import { PageHeaderSkeleton } from "@/app/_components/LoadingSkeleton";
import TenantPaymentHistory from "./TenantPaymentHistory";
import PortalAccessPanel from "./PortalAccessPanel";
import TenantBills from "./TenantBills";

export default function TenantDetails({ tenantId, refresh, onBackgroundRefresh }) {
  const [activeTab, setActiveTab] = useState("details");
  const [tenant, setTenant] = useState(null);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const tenantDetails = await Tenants.getFullDetails(tenantId);
        if (cancelled) return;
        setTenant(tenantDetails || null);

        const unitId =
          typeof tenantDetails?.unit_id === "object"
            ? tenantDetails.unit_id.id
            : tenantDetails?.unit_id;
        if (unitId) {
          const u = await Units.getById(unitId);
          if (!cancelled) setUnit(u || null);
        } else if (!cancelled) {
          setUnit(null);
        }
      } catch (err) {
        console.error("Failed to load tenant details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenant && loading) {
    return <PageHeaderSkeleton rows={8} columns={7} />;
  }

  const cycleMonths = tenant?.billing_cycle_months ?? 1;
  const cycleLabel = !tenant?.billing_cycle_enabled
    ? "Monthly"
    : ({ 2: "Bi-monthly", 3: "Quarterly", 6: "Bi-annual", 12: "Annual" }[cycleMonths] ?? `Every ${cycleMonths} months`);

  function nextBillingDate(t) {
    if (!t?.lease_start) return "—";
    const start = new Date(t.lease_start);
    const today = new Date();
    const months = t.billing_cycle_months ?? 1;
    let next = new Date(start);
    while (next <= today) next.setMonth(next.getMonth() + months);
    return next.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  }

  const rentAmount = unit?.rent_amount ?? 0;
  const amountPerCycle = rentAmount * cycleMonths;

  return (
    <div className="p-4">

      {tenant && (
        <div className="mb-4 grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <div>
            <p className="text-gray-500">Billing cycle</p>
            <p className="font-semibold text-gray-900">{cycleLabel}</p>
          </div>
          <div>
            <p className="text-gray-500">Next bill due</p>
            <p className="font-semibold text-gray-900">{nextBillingDate(tenant)}</p>
          </div>
          <div>
            <p className="text-gray-500">Amount per cycle</p>
            <p className="font-semibold text-gray-900">KSh {amountPerCycle.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "details"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("details")}
        >
          Tenant Info
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "payments"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("payments")}
        >
          Payment History
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "bills"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("bills")}
        >
          Bills
        </button>
      </div>


      {activeTab === "details" && tenant && (
        <div className="space-y-4">
          <PortalAccessPanel
            tenantId={tenantId}
            onChange={onBackgroundRefresh}
          />
          <TenantForm
            tenant={tenant}
            onSuccess={() => {
              refresh?.();
            }}
          />
        </div>
      )}

      {activeTab === "payments" && tenantId && (
        <TenantPaymentHistory tenantId={tenantId} tenant={tenant} unit={unit} />
      )}

      {activeTab === "bills" && tenantId && (
        <TenantBills unit={unit} />
      )}
    </div>
  );
}
