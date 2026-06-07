"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import { Mail } from "lucide-react";

import ErrorBoundary from "@/app/_components/ErrorBoundary";
import LoadingSkeleton, {
  FiltersSkeleton,
  PageHeaderSkeleton,
} from "@/app/_components/LoadingSkeleton";

import TenantFilters from "./components/TenantFilters";
import TenantTable from "./components/TenantTable";
import TenantModals from "./components/TenantModals";
import BulkInvoiceModal from "./components/BulkInvoiceModal";
import UnassignedPaymentsTab from "./components/UnassignedPaymentsTab";
import useTenants from "./hooks/useTenants";
import {
  filterTenants,
  getDefaultFilters,
  hasActiveFilters,
  getFilterSummary,
} from "./utils/tenantFilters";
import { useAuth } from "@/app/_context/AuthContext";

export default function TenantsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("tenants:create");
  const canEdit = hasPermission("tenants:edit");
  const canDelete = hasPermission("tenants:delete");
  const canCreatePayments = hasPermission("payments:create");
  const canSendDocuments = hasPermission("reports:export");
  const handledNewParam = useRef(false);
  const { tenants, loading, fetchTenants, deleteTenant, cancelLease } =
    useTenants();

  const [modals, setModals] = useState({
    add: false,
    details: false,
    shift: false,
  });

  useEffect(() => {
    if (searchParams.get("new") === "true" && !handledNewParam.current) {
      handledNewParam.current = true;
      if (canCreate) setModals((prev) => ({ ...prev, add: true }));
      window.history.replaceState(window.history.state, "", pathname);
    }
  }, [canCreate, pathname, searchParams]);

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantToShift, setTenantToShift] = useState(null);
  const [showBulkInvoice, setShowBulkInvoice] = useState(false);
  const [activeTab, setActiveTab] = useState("tenants");

  const [filters, setFilters] = useState(getDefaultFilters());

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    return filterTenants(tenants, filters);
  }, [tenants, filters]);

  const openModal = useCallback((type, tenant = null) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    if (type === "details") setSelectedTenant(tenant);
    if (type === "shift") setTenantToShift(tenant);
  }, []);

  const closeModal = useCallback((type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    if (type === "details") setSelectedTenant(null);
    if (type === "shift") setTenantToShift(null);
  }, []);

  const handleViewDetails = useCallback(
    (tenant) => {
      openModal("details", tenant);
    },
    [openModal],
  );

  const handleShiftTenant = useCallback(
    (tenant) => {
      openModal("shift", tenant);
    },
    [openModal],
  );

  const handleDeleteTenant = useCallback(
    (tenantId) => {
      deleteTenant(tenantId);
    },
    [deleteTenant],
  );

  const handleCancelLease = useCallback(
    (tenantId, tenantName) => {
      cancelLease(tenantId, tenantName);
    },
    [cancelLease],
  );

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <PageHeaderSkeleton />
        <FiltersSkeleton />
        <div className="bg-white p-4 rounded-lg border">
          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <LoadingSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <ErrorBoundary
      title="Error Loading Tenants"
      message="We couldn't load the tenants data. This might be a temporary issue."
      onRetry={fetchTenants}
      contactSupport={true}
    >
      <div className="space-y-5 p-3 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">— Tenants —</p>
            <h1
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tenants
            </h1>
            <p className="mt-1 text-sm text-black/55">
              All active and inactive tenants in your portfolio. Filter,
              invoice, or shift in bulk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSendDocuments && (
              <button
                type="button"
                onClick={() => setShowBulkInvoice(true)}
                className="inline-flex items-center gap-2 border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-colors hover:bg-blue-50"
              >
                <Mail size={14} strokeWidth={1.8} />
                Send all invoices
              </button>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => openModal("add")}
                className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                + Add Tenant
              </button>
            )}
          </div>
        </header>

        <TenantFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tenants={tenants}
        />

        <div className="flex border-b border-stone-200">
          {[
            { id: "tenants", label: "Tenants" },
            { id: "unassigned", label: "Unassigned payments" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] ${
                activeTab === tab.id
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-black/45 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "tenants" ? (
          <>
            <div className="flex items-center justify-between border border-stone-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black/55">
              <span>{getFilterSummary(filteredTenants, tenants, filters)}</span>
              {hasActiveFilters(filters) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-blue-700 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>

            <TenantTable
              tenants={filteredTenants}
              onViewDetails={handleViewDetails}
              onShiftTenant={handleShiftTenant}
              onDeleteTenant={handleDeleteTenant}
              onCancelLease={handleCancelLease}
              onRefreshTenants={fetchTenants}
              canCreatePayments={canCreatePayments}
              canSendDocuments={canSendDocuments}
              canEditTenants={canEdit}
              canDeleteTenants={canDelete}
            />
          </>
        ) : (
          <UnassignedPaymentsTab canAssign={canCreatePayments} />
        )}

        <TenantModals
          modals={modals}
          onCloseModal={closeModal}
          selectedTenant={selectedTenant}
          tenantToShift={tenantToShift}
          onRefreshTenants={fetchTenants}
          canEditTenants={canEdit}
        />

        {canSendDocuments && (
          <BulkInvoiceModal
            isOpen={showBulkInvoice}
            onClose={() => setShowBulkInvoice(false)}
            tenants={filteredTenants}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
