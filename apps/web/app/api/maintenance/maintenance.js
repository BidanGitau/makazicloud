import { createCRUD } from "../../_lib/crud";


const baseMaintenance = createCRUD("maintenance_requests", {
  defaultSelect:
    "id, tenant_id, property_id, block_id, unit_id, category, title, description, status, priority, reported_date, completed_date, estimated_cost, actual_cost, vendor_name, notes, is_tenant_fault, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});

const maintenanceWithDetails = createCRUD("v_maintenance_requests_with_details", {
  defaultOrder: { column: "created_at", ascending: false },
  readOnly: true,
});

export const Maintenance = {
  ...baseMaintenance,


  async getWithDetails({ propertyId, status, category } = {}) {
    const match = {};
    if (propertyId) match.property_id = propertyId;
    if (status) match.status = status;
    if (category) match.category = category;

    return maintenanceWithDetails.getAll({
      match,
      order: { column: "created_at", ascending: false },
    });
  },
};


const baseAdvances = createCRUD("owner_advances", {
  defaultSelect:
    "id, property_id, amount, purpose, status, requested_date, disbursed_date, maintenance_id, notes, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});

const advancesWithDetails = createCRUD("v_owner_advances_with_details", {
  defaultOrder: { column: "created_at", ascending: false },
  readOnly: true,
});

export const OwnerAdvances = {
  ...baseAdvances,

  async getWithDetails({ propertyId } = {}) {
    const match = {};
    if (propertyId) match.property_id = propertyId;

    return advancesWithDetails.getAll({
      match,
      order: { column: "created_at", ascending: false },
    });
  },
};


export const PropertyNetIncome = createCRUD("property_net_income", {
  defaultSelect: "*",
  readOnly: true,
});
