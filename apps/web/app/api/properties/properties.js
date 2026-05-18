import { createCRUD } from "../../_lib/crud";

/**
 * ============================
 * Properties & Structure
 * ============================
 */
const basePropertiesRepo = createCRUD("properties", {
  defaultSelect:
    "id, name, address, created_at, owner_name, user_id, unit_count, recurring_bills, payment_info",
});

export const Properties = {
  ...basePropertiesRepo,

  /**
   * Properties with their blocks + units already nested. Replaces the
   * pattern where pages issued 3 parallel calls (Properties.getAll,
   * Blocks.getAll, Units.getAll) and grouped the result client-side —
   * which fetched the full tables every time.
   *
   * Still 3 calls under the hood (the data API doesn't expose joins),
   * but every caller gets the SAME shape from the SAME loader so there's
   * a single place to optimize later (e.g. one server endpoint that
   * returns the joined view).
   */
  async getTree({ propertyOrder, blockOrder, unitOrder } = {}) {
    const [propertyRows, blockRows, unitRows] = await Promise.all([
      basePropertiesRepo.getAll({
        order: propertyOrder || { column: "name", ascending: true },
      }),
      Blocks.getAll({
        order: blockOrder || { column: "name", ascending: true },
      }),
      Units.getAll({
        order: unitOrder || { column: "unit_number", ascending: true },
      }),
    ]);

    const normalizedUnits = (unitRows || []).map((unit) => ({
      ...unit,
      status: String(unit.status || "vacant").toLowerCase(),
    }));

    return (propertyRows || []).map((property) => {
      const propertyBlocks = (blockRows || [])
        .filter((block) => block.property_id === property.id)
        .map((block) => ({
          ...block,
          total_units: Number(block.unit_count || 0),
          units: normalizedUnits.filter((unit) => unit.block_id === block.id),
        }));

      const directUnits = normalizedUnits.filter(
        (unit) => unit.property_id === property.id && !unit.block_id,
      );
      const blockTotal = propertyBlocks.reduce(
        (sum, block) => sum + Number(block.unit_count || 0),
        0,
      );
      const derivedTotal =
        blockTotal || directUnits.length || Number(property.unit_count || 0);

      return {
        ...property,
        blocks: propertyBlocks,
        units: directUnits,
        unit_count: Number(property.unit_count || derivedTotal || 0),
        total_units: derivedTotal,
      };
    });
  },
};

export const Blocks = createCRUD("blocks", {
  defaultSelect: "id, property_id, name, unit_count, created_at",
});

export const Units = {
  ...createCRUD("units", {
    defaultSelect:
      "id, property_id, block_id, unit_number, type, floor, status, rent_amount, deposit_amount",
  }),

  async getByProperty(propertyId) {
    if (!propertyId) return [];
    return await createCRUD("units", {
      defaultSelect:
        "id, property_id, block_id, unit_number, type, floor, status, rent_amount, deposit_amount",
    }).getAll({
      match: { property_id: propertyId },
    });
  },

  async getByBlock(blockId) {
    if (!blockId) return [];
    return await createCRUD("units").getAll({
      match: { block_id: blockId },
    });
  },
};

export const UserProperties = createCRUD("user_properties", {
  defaultSelect: "user_id, property_id, created_at",
});
