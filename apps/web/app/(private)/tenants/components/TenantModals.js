"use client";

import { showToast } from "@/app/_components/CustomToast";
import ModalSlider from "@/app/_components/ModalSlider";
import TenantForm from "../TenantForm";
import ShiftTenant from "../ShiftTenant";
import TenantDetails from "../tenantDetails/TenantDetails";

const TenantModals = ({
  modals,
  onCloseModal,
  selectedTenant,
  tenantToShift,
  onRefreshTenants,
}) => {
  const handleAddTenantSuccess = () => {
    onCloseModal("add");
    onRefreshTenants();
    showToast.success("Tenant added successfully!");
  };

  const handleShiftTenantSuccess = () => {
    onCloseModal("shift");
    onRefreshTenants();
  };

  const handleUpdateTenantSuccess = () => {
    onCloseModal("details");
    onRefreshTenants();
    showToast.success("Tenant updated successfully!");
  };

  return (
    <>
      {/* Add Tenant Modal */}
      <ModalSlider
        isOpen={modals.add}
        onClose={() => onCloseModal("add")}
        title="Add New Tenant"
      >
        <TenantForm onSuccess={handleAddTenantSuccess} />
      </ModalSlider>

      {/* Tenant Details Modal */}
      <ModalSlider
        isOpen={modals.details}
        onClose={() => onCloseModal("details")}
        title=""
      >
        {selectedTenant && (
          <TenantDetails
            tenantId={selectedTenant.tenant_id || selectedTenant.id}
            refresh={handleUpdateTenantSuccess}
            // Background refresh used by side-panels (portal access, etc.)
            // — refreshes the tenant list without closing the modal so
            // admin can keep working in the slider.
            onBackgroundRefresh={onRefreshTenants}
          />
        )}
      </ModalSlider>

      {/* Shift Tenant Modal */}
      <ModalSlider
        isOpen={modals.shift}
        onClose={() => onCloseModal("shift")}
        title={`Shift Tenant: ${tenantToShift?.full_name || ""}`}
      >
        {tenantToShift && (
          <ShiftTenant
            tenant={tenantToShift}
            onSuccess={handleShiftTenantSuccess}
          />
        )}
      </ModalSlider>
    </>
  );
};

export default TenantModals;
