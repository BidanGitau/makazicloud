import { createCRUD } from "../../_lib/crud";

// ===== Maintenance Requests =====
const baseMaintenance = createCRUD("maintenance_requests", {
  defaultSelect:
    "id, tenant_id, property_id, block_id, unit_id, category, title, description, status, priority, reported_date, completed_date, estimated_cost, actual_cost, vendor_name, notes, is_tenant_fault, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});

export const Maintenance = {
  ...baseMaintenance,

  /**
   * Fetch requests joined with property / block / unit names.
   * Joins are done client-side from the cached lookup repos because the
   * backend `/data/:table` controller doesn't parse nested selects.
   */
  async getWithDetails({ propertyId, status, category } = {}) {
    const match = {};
    if (propertyId) match.property_id = propertyId;
    if (status) match.status = status;
    if (category) match.category = category;

    const Properties = createCRUD("properties", { defaultSelect: "id, name" });
    const Blocks = createCRUD("blocks", { defaultSelect: "id, name" });
    const Units = createCRUD("units", { defaultSelect: "id, unit_number" });

    const [requests, properties, blocks, units] = await Promise.all([
      this.getAll({ match, order: { column: "created_at", ascending: false } }),
      Properties.getAll(),
      Blocks.getAll(),
      Units.getAll(),
    ]);

    const propsById = new Map(properties.map((p) => [p.id, p]));
    const blocksById = new Map(blocks.map((b) => [b.id, b]));
    const unitsById = new Map(units.map((u) => [u.id, u]));

    return requests.map((r) => ({
      ...r,
      properties: propsById.get(r.property_id) || null,
      blocks: r.block_id ? blocksById.get(r.block_id) || null : null,
      units: r.unit_id ? unitsById.get(r.unit_id) || null : null,
    }));
  },
};

// ===== Owner Advances =====
const baseAdvances = createCRUD("owner_advances", {
  defaultSelect:
    "id, property_id, amount, purpose, status, requested_date, disbursed_date, maintenance_id, notes, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});

export const OwnerAdvances = {
  ...baseAdvances,

  async getWithDetails({ propertyId } = {}) {
    const match = {};
    if (propertyId) match.property_id = propertyId;

    const Properties = createCRUD("properties", { defaultSelect: "id, name" });
    const [advances, properties, maintenanceRequests] = await Promise.all([
      this.getAll({ match, order: { column: "created_at", ascending: false } }),
      Properties.getAll(),
      baseMaintenance.getAll({ }),
    ]);

    const propsById = new Map(properties.map((p) => [p.id, p]));
    const mrById = new Map(maintenanceRequests.map((m) => [m.id, m]));

    return advances.map((a) => ({
      ...a,
      properties: propsById.get(a.property_id) || null,
      maintenance_requests: a.maintenance_id
        ? mrById.get(a.maintenance_id) || null
        : null,
    }));
  },
};

// ===== Property Net Income view =====
export const PropertyNetIncome = createCRUD("property_net_income", {
  defaultSelect: "*",
  readOnly: true,
});
