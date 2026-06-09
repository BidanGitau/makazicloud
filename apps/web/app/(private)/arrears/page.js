"use client";

import { useMemo, useState } from "react";
import { useFormData } from "@/app/_hooks/useFormData";
import { useAuth } from "@/app/_context/AuthContext";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import PageWrapper from "@/app/_components/PageWrapper";
import ModalSlider from "@/app/_components/ModalSlider";
import SendArrearEmailModal from "@/app/_components/SendArrearEmailModal";
import PaymentForm from "@/app/(private)/payments/PaymentForm";
import ReminderModal from "./ReminderModal";
import ArrearsFilters from "./components/ArrearsFilters";
import ArrearsHeader from "./components/ArrearsHeader";
import ArrearsSummary from "./components/ArrearsSummary";
import ArrearsTable from "./components/ArrearsTable";
import { useArrears } from "./hooks/useArrears";
import {
  filterArrears,
  groupArrearsByTenant,
  summarizeArrears,
  uniqueEmailTenants,
} from "./utils/arrearsData";

const emptyFilters = {
  monthFilter: "",
  propertyFilter: "",
  blockFilter: "",
  statusFilter: "arrears",
  tenantStatusFilter: "active",
};

export default function ArrearsPage() {
  const { hasPermission } = useAuth();
  const canCreatePayments = hasPermission("payments:create");
  const canManageArrears = hasPermission("arrears:manage");
  const [filters, setFilters] = useState(emptyFilters);
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [smsPhoneNumbers, setSmsPhoneNumbers] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTenants, setEmailTenants] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [paymentTenant, setPaymentTenant] = useState(null);

  const { properties, blocks } = useFormData();
  const { loading, arrearsData, fetchArrears, refreshArrears } = useArrears({
    canPopulate: canManageArrears,
  });

  const selectedPropertyBlocks = useMemo(
    () =>
      filters.propertyFilter
        ? blocks.filter((b) => b.property_id === filters.propertyFilter)
        : [],
    [blocks, filters.propertyFilter],
  );

  const filteredData = useMemo(
    () => filterArrears(arrearsData, filters),
    [arrearsData, filters],
  );

  const groupedData = useMemo(
    () => groupArrearsByTenant(filteredData),
    [filteredData],
  );

  const summary = useMemo(
    () => summarizeArrears(filteredData),
    [filteredData],
  );

  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearFilters = () => {
    setFilters((current) => ({
      ...emptyFilters,
      statusFilter: current.statusFilter,
      tenantStatusFilter: current.tenantStatusFilter,
    }));
  };

  const openSmsModal = (tenant = null, rows = null) => {
    setSelectedTenant(tenant);

    const source = rows || (tenant ? null : filteredData);
    const phones = source
      ? [...new Set(source.map((r) => r.tenantPhone).filter(Boolean))]
      : [];
    setSmsPhoneNumbers(phones);
    setShowModal(true);
  };

  const openEmailModal = (rows) => {
    setEmailTenants(uniqueEmailTenants(rows));
    setShowEmailModal(true);
  };

  const openPaymentModal = (row) => {
    setPaymentTenant({
      tenant_id: row.tenant_id,
      full_name: row.tenantName,
      property_name: row.propertyName,
      unit_number: row.unitNumber,
    });
  };

  if (loading) {
    return <PageSkeleton cards={3} hasFilters />;
  }

  return (
    <PageWrapper>
      <div className="space-y-5">
        <ArrearsHeader
          selectedCount={selectedRows.length}
          loading={loading}
          onBulkEmail={canManageArrears ? () => openEmailModal(selectedRows) : null}
          onBulkSms={canManageArrears ? () => openSmsModal(null, selectedRows) : null}
          onSmsAll={canManageArrears ? () => openSmsModal(null) : null}
          onRefresh={refreshArrears}
        />

        <ArrearsSummary summary={summary} />

        <ArrearsFilters
          arrearsData={arrearsData}
          properties={properties}
          selectedPropertyBlocks={selectedPropertyBlocks}
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
        />

        <ArrearsTable
          rows={groupedData}
          statusFilter={filters.statusFilter}
          onPayment={canCreatePayments ? openPaymentModal : null}
          onSms={canManageArrears ? openSmsModal : null}
          onEmail={canManageArrears ? openEmailModal : null}
          onSelectedRowsChange={setSelectedRows}
        />
      </div>

      {canManageArrears && (
        <SendArrearEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          tenants={emailTenants}
        />
      )}

      {canManageArrears && (
        <ReminderModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          tenant={selectedTenant}
          phoneNumbers={smsPhoneNumbers}
        />
      )}

      {canCreatePayments && (
        <ModalSlider
          isOpen={!!paymentTenant}
          onClose={() => setPaymentTenant(null)}
          title="Add Payment"
        >
          <PaymentForm
            key={paymentTenant?.tenant_id || "arrears-payment"}
            initialTenantId={paymentTenant?.tenant_id}
            initialTenant={paymentTenant}
            onSuccess={async () => {
              setPaymentTenant(null);
              await fetchArrears();
            }}
          />
        </ModalSlider>
      )}
    </PageWrapper>
  );
}
