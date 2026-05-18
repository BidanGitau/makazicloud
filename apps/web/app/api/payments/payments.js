import { createCRUD } from "../../_lib/crud";

/**
 * ============================
 * Payments
 * ============================
 */
export const Payments = {
  ...createCRUD("payments", {
    defaultSelect:
      "id, tenant_id, amount, payment_date, method, reference, created_at, user_id",
  }),

  async getByTenant(tenantId) {
    return await createCRUD("payments").getAll({
      match: { tenant_id: tenantId },
      order: { column: "payment_date", ascending: false },
    });
  },
};

/**
 * ============================
 * Payment Allocations
 * ============================
 */
export const PaymentAllocations = {
  ...createCRUD("payment_allocations", {
    defaultSelect:
      "id, payment_id, tenant_id, allocation_type, reference_id, lease_month, amount, status, created_at",
  }),

  async getByTenant(tenantId) {
    return await createCRUD("payment_allocations").getAll({
      match: { tenant_id: tenantId },
      order: { column: "lease_month", ascending: false },
    });
  },

  async getByPayment(paymentId) {
    return await createCRUD("payment_allocations").getAll({
      match: { payment_id: paymentId },
    });
  },
};
