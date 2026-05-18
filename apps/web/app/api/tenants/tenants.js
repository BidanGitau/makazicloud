import { createCRUD } from "../../_lib/crud";

/**
 * ============================
 * Tenant Overview (View)
 * ============================
 */
export const TenantOverview = createCRUD("v_tenant_overview", {
  defaultSelect:
    "tenant_id, full_name, lease_start, unit_id, rent_amount, rent_due_date, status, unit_number, unit_type, floor, unit_status, property_id, property_name, block_id, block_name, arrears_balance",
  readOnly: true,
});

/**
 * ============================
 * Tenants
 * ============================
 */
export const Tenants = {
  ...createCRUD("tenants", {
    defaultSelect:
      "id, unit_id, lease_start, rent_due_date, status, full_name, national_id, emergency_contact, occupation, notes, email, billing_cycle_enabled, billing_cycle_months",
  }),

  /** 🚀 Fetch tenants with joined context via view */
  async getOverview() {
    return await TenantOverview.getAll({
      order: { column: "full_name", ascending: true },
    });
  },

  /** 🔍 Fetch tenant details directly from the view */
  async getDetails(id) {
    const results = await TenantOverview.getAll({
      match: { tenant_id: id },
      limit: 1,
    });
    return results.length ? results[0] : null;
  },

  async getFullDetails(id) {
    const [tenant] = await createCRUD("tenants").getAll({
      match: { id },
      limit: 1,
    });
    return tenant || null;
  },

  /**
   * Server-side typeahead. Returns at most `limit` overview rows where
   * full_name matches the query (case-insensitive). Pass `signal` from the
   * caller's AbortController so stale keystrokes can cancel in-flight requests.
   */
  async search(query, { limit = 20, signal } = {}) {
    const trimmed = String(query || "").trim();
    if (trimmed.length === 0) return [];
    return await TenantOverview.getAll({
      filter: [{ column: "full_name", operator: "ilike", value: trimmed }],
      order: { column: "full_name", ascending: true },
      limit,
      signal,
    });
  },

  /** 🔄 Shift tenant to another unit */
  async shiftTenant(tenantId, newUnitId) {
    if (!tenantId || !newUnitId) throw new Error("Missing tenant or unit ID");
    const tenant = await this.getById(tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const oldUnitId = tenant.unit_id;
    await createCRUD("tenants").update(tenantId, { unit_id: newUnitId });

    if (oldUnitId)
      await createCRUD("units").update(oldUnitId, { status: "Vacant" });
    await createCRUD("units").update(newUnitId, { status: "Occupied" });

    return await this.getDetails(tenantId);
  },
};

/**
 * ============================
 * Tenant Details
 * ============================
 */
export const TenantDetails = createCRUD("tenant_details", {
  defaultSelect:
    "id, tenant_id, full_name, national_id, emergency_contact, occupation, notes, created_at",
});

/**
 * ============================
 * Tenant Reports
 * ============================
 */
export const TenantReports = {
  /**
   * Fetch tenant history for a given date range
   * @param {string} tenantId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   */
  async getHistory(tenantId, startDate, endDate) {
    if (!tenantId) throw new Error("Tenant ID is required");

    // 2 parallel fetches: payments + one arrears query covering both real
    // arrears (pending/partial within range) and prepaid (future credit).
    // Tenant header info is supplied by the caller — no redundant fetch.
    const [payments, allArrears] = await Promise.all([
      createCRUD("payments").getAll({
        match: { tenant_id: tenantId },
        filter: [
          { column: "payment_date", operator: ">=", value: startDate },
          { column: "payment_date", operator: "<=", value: endDate },
        ],
        order: { column: "payment_date", ascending: true },
      }),
      createCRUD("arrears").getAll({
        match: { tenant_id: tenantId },
        filter: [
          { column: "month", operator: ">=", value: startDate },
          { column: "status", operator: "IN", value: ["pending", "partial", "prepaid"] },
        ],
        order: { column: "month", ascending: true },
      }),
    ]);

    const arrears = allArrears.filter(
      (a) =>
        ["pending", "partial"].includes(String(a.status || "").toLowerCase()) &&
        a.month <= endDate,
    );
    const prepaid = allArrears.filter(
      (a) =>
        String(a.status || "").toLowerCase() === "prepaid" &&
        a.month > endDate,
    );

    // 5️⃣ Totals (NOW CORRECT)
    const totalPayments = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const totalArrearsDue = arrears.reduce(
      (sum, a) => sum + Number(a.amount_due || 0),
      0,
    );

    const totalArrearsPaid = arrears.reduce(
      (sum, a) => sum + Number(a.amount_paid || 0),
      0,
    );

    const balance = totalArrearsDue - totalArrearsPaid;

    const prepaidBalance = prepaid.reduce(
      (sum, p) => sum + Number(p.amount_paid || 0),
      0,
    );

    // PDF / API-ready response. Tenant header is the caller's
    // responsibility — they already have it from the parent view.
    return {
      period: {
        startDate,
        endDate,
      },

      summary: {
        totalPayments,
        totalArrearsDue,
        totalArrearsPaid,
        balance, // ✅ real outstanding debt only
        prepaidBalance, // ✅ future credit
      },

      payments: payments.map((p) => ({
        date: p.payment_date,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
      })),

      arrears: arrears.map((a) => ({
        month: a.month,
        due: a.amount_due,
        paid: a.amount_paid,
        status: a.status,
      })),

      prepaid: prepaid.map((p) => ({
        month: p.month,
        paid: p.amount_paid,
        status: p.status,
      })),
    };
  },
};
