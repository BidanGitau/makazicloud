import { createCRUD } from "../../_lib/crud";


export const Arrears = {
  ...createCRUD("arrears", {
    defaultSelect:
      "id, tenant_id, month, due_date, amount_due, amount_paid, status",
  }),

  async getByTenant(tenantId) {
    return await createCRUD("arrears").getAll({
      match: { tenant_id: tenantId },
      order: { column: "month", ascending: false },
    });
  },
};


export const ArrearDetails = createCRUD("v_arrears_with_details", {
  defaultSelect: "*",
  readOnly: true,
});
