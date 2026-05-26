import { createCRUD } from "../../_lib/crud";


export const UtilityUnitAssignments = {
  ...createCRUD("utility_unit_assignments", {
    defaultSelect:
      "id, property_id, unit_id, service_type, billing_type, monthly_cost, rate_per_unit, is_active, created_at",
  }),

  async getByProperty(propertyId) {
    if (!propertyId) return [];
    return await createCRUD("utility_unit_assignments").getAll({
      match: { property_id: propertyId },
      order: { column: "created_at", ascending: false },
    });
  },
};


export const UtilityMeterReadings = {
  ...createCRUD("utility_meter_readings", {
    defaultSelect:
      "id, property_id, unit_id, service_type, billing_month, previous_reading, current_reading, consumption, rate_per_unit, amount, bill_id, notes, created_at",
  }),

  async getByProperty(propertyId) {
    if (!propertyId) return [];
    return await createCRUD("utility_meter_readings").getAll({
      match: { property_id: propertyId },
      order: { column: "billing_month", ascending: false },
    });
  },


  async getLastReadings(unitIds, serviceType) {
    if (!unitIds?.length || !serviceType) return {};
    const rows = await createCRUD("utility_meter_readings", {
      defaultSelect: "unit_id, current_reading, billing_month",
    }).getAll({
      match: {
        service_type: serviceType,
        unit_id: { operator: "in", value: unitIds },
      },
      order: { column: "billing_month", ascending: false },
    });

    const map = {};
    for (const row of rows) {
      if (!(row.unit_id in map)) map[row.unit_id] = Number(row.current_reading ?? 0);
    }
    return map;
  },
};


const UTILITY_BILLS_SELECT =
  "id, property_id, block_id, unit_id, name, service_type, billing_type, rate_per_unit, units_consumed, previous_reading, current_reading, billing_month, total_amount, due_date, status, paid_amount, payment_date, reference, assign_all";

export const UtilityBills = {
  ...createCRUD("utility_bills", {
    defaultSelect: UTILITY_BILLS_SELECT,
  }),

  async getByProperty(propertyId) {
    if (!propertyId) return [];
    return await createCRUD("utility_bills", { defaultSelect: UTILITY_BILLS_SELECT }).getAll({
      match: { property_id: propertyId },
      order: { column: "billing_month", ascending: false },
    });
  },

  async getLastReading(propertyId, serviceType) {
    if (!propertyId || !serviceType) return null;
    const rows = await createCRUD("utility_bills", {
      defaultSelect: "current_reading, billing_month",
    }).getAll({
      match: { property_id: propertyId, service_type: serviceType, billing_type: "metered" },
      order: { column: "billing_month", ascending: false },
      limit: 1,
    });
    return rows[0]?.current_reading ?? null;
  },

  async getAllWithDetails(options = {}) {
    return await createCRUD("v_utility_bills_with_details").getAll({
      ...options,
      order: { column: "billing_month", ascending: false },
    });
  },

  async getForTenantUnit(unit) {
    if (!unit?.id || !unit?.property_id) return [];
    const rows = await this.getAllWithDetails({
      match: { property_id: unit.property_id },
    });

    return rows.filter((bill) => {
      if (bill.unit_id) return bill.unit_id === unit.id;
      if (!bill.assign_all) return false;
      if (bill.block_id && bill.block_id !== unit.block_id) return false;
      return true;
    });
  },

  async markPaid(bill, { reference = null, paymentDate = null } = {}) {
    if (!bill?.id) throw new Error("Utility bill is required");
    return await this.update(bill.id, {
      status: "paid",
      paid_amount: bill.total_amount,
      payment_date: paymentDate || new Date().toISOString().split("T")[0],
      reference: reference || bill.reference || null,
    });
  },
};
