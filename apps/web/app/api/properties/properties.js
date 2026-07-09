import { createCRUD } from "../../_lib/crud";


const basePropertiesRepo = createCRUD("properties", {
  defaultSelect:
    "id, name, address, created_at, owner_name, user_id, unit_count, rent_due_day, commission_rate, recurring_bills, payment_info",
});

export const Properties = {
  ...basePropertiesRepo,


  async getTree({ propertyOrder, blockOrder, unitOrder } = {}) {
    const [propertyRows, blockRows, unitRows] = await Promise.all([
      basePropertiesRepo.getAllPages({
        order: propertyOrder || { column: "name", ascending: true },
      }),
      Blocks.getAllPages({
        order: blockOrder || { column: "name", ascending: true },
      }),
      Units.getAllPages({
        order: unitOrder || { column: "unit_number", ascending: true },
      }),
    ]);

    const normalizedUnits = (unitRows || []).map((unit) => ({
      ...unit,
      status: String(unit.status || "vacant").toLowerCase(),
    }));
    const blocksByProperty = new Map();
    const unitsByBlock = new Map();
    const directUnitsByProperty = new Map();

    for (const block of blockRows || []) {
      const list = blocksByProperty.get(block.property_id) || [];
      list.push(block);
      blocksByProperty.set(block.property_id, list);
    }

    for (const unit of normalizedUnits) {
      if (unit.block_id) {
        const list = unitsByBlock.get(unit.block_id) || [];
        list.push(unit);
        unitsByBlock.set(unit.block_id, list);
        continue;
      }
      const list = directUnitsByProperty.get(unit.property_id) || [];
      list.push(unit);
      directUnitsByProperty.set(unit.property_id, list);
    }

    return (propertyRows || []).map((property) => {
      const propertyBlocks = (blocksByProperty.get(property.id) || [])
        .map((block) => ({
          ...block,
          total_units: Number(block.unit_count || 0),
          units: unitsByBlock.get(block.id) || [],
        }));

      const directUnits = directUnitsByProperty.get(property.id) || [];
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
