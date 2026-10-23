import { createCRUD } from "../../_lib/crud";
import { apiFetch } from "../../_lib/api/client";


export const Payments = {
  ...createCRUD("payments", {
    defaultSelect:
      "id, tenant_id, amount, payment_date, method, reference, created_at, user_id, status, void_reason",
  }),

  async getByTenant(tenantId) {
    return await createCRUD("payments").getAll({
      match: { tenant_id: tenantId },
      order: { column: "payment_date", ascending: false },
    });
  },

  // Owner only: cancels the payment and rolls back the arrears it cleared.
  async void(paymentId, reason) {
    return apiFetch(`/payments/${paymentId}/void`, {
      method: "POST",
      body: { reason },
    });
  },

  // Owner only: cancels the payment and records it again with the right amount.
  async correct(paymentId, amount, reason) {
    return apiFetch(`/payments/${paymentId}/correct`, {
      method: "POST",
      body: { amount, reason },
    });
  },
};


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
