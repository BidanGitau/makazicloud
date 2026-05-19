import { createCRUD } from "../../_lib/crud";

const baseRefunds = createCRUD("refunds", {
  defaultSelect:
    "id, tenant_id, unit_id, lease_end_date, amount_refunded, status, notes, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});
const tenantsRepo = createCRUD("tenants", {
  defaultSelect:
    "id, full_name, unit_id, lease_start, status, billing_cycle_enabled, billing_cycle_months",
});
const unitsRepo = createCRUD("units", {
  defaultSelect: "id, property_id, block_id, unit_number, deposit_amount, status",
});
const propertiesRepo = createCRUD("properties", {
  defaultSelect: "id, name",
});
const maintenanceRepo = createCRUD("maintenance_requests", {
  defaultSelect:
    "id, property_id, unit_id, amount, actual_cost, estimated_cost, is_tenant_fault",
});
const arrearsRepo = createCRUD("arrears", {
  defaultSelect: "id, tenant_id, month, amount_due, amount_paid, status",
});
const paymentsRepo = createCRUD("payments", {
  defaultSelect: "id, tenant_id, amount, payment_date, method, reference",
});

// Outstanding portion of an arrears row.
const arrearsBalance = (a) =>
  Math.max(0, Number(a?.amount_due || 0) - Number(a?.amount_paid || 0));

// An arrears row is "open" if it's currently due (pending or partial).
const isOpenArrear = (a) =>
  ["pending", "partial"].includes(String(a?.status || "").toLowerCase());

export const Refunds = {
  ...baseRefunds,

  /**
   * Build the refund list. Deductions = tenant-fault maintenance + open
   * arrears. The arrears piece is what makes the table "auto-compute" — when
   * you process a refund, what you see here is what gets locked in.
   *
   * Filtering is pushed server-side wherever possible. Previous version
   * fetched every tenant, unit, and property in the org and filtered in
   * memory — fine on dev data, brutal on a 5k-tenant prod org.
   */
  async getWithDetails({ propertyId, tenantStatus = "inactive" } = {}) {
    // 1. Tenants narrowed by status on the server. Reduces the working
    //    set before any joins.
    const statusMatch =
      tenantStatus && tenantStatus !== "all" ? { status: tenantStatus } : {};
    const allTenants = await tenantsRepo.getAll({ match: statusMatch });
    if (!allTenants.length) return [];

    // 2. Only fetch the units referenced by these tenants (IN filter on id).
    const candidateUnitIds = [
      ...new Set(allTenants.map((tenant) => tenant.unit_id).filter(Boolean)),
    ];
    const units = candidateUnitIds.length
      ? await unitsRepo.getAll({
          match: { id: { operator: "in", value: candidateUnitIds } },
        })
      : [];
    const unitsById = Object.fromEntries(units.map((unit) => [unit.id, unit]));

    // 3. Apply the property filter using the unit→property mapping; drop
    //    tenants whose unit was deleted.
    const tenants = allTenants.filter((tenant) => {
      const unit = unitsById[tenant.unit_id];
      if (!unit) return false;
      return !propertyId || unit.property_id === propertyId;
    });
    if (!tenants.length) return [];

    const tenantIds = tenants.map((tenant) => tenant.id);
    const unitIds = [
      ...new Set(tenants.map((tenant) => tenant.unit_id).filter(Boolean)),
    ];

    // 4. Only the properties actually referenced.
    const propertyIds = [
      ...new Set(unitIds.map((id) => unitsById[id]?.property_id).filter(Boolean)),
    ];
    const properties = propertyIds.length
      ? await propertiesRepo.getAll({
          match: { id: { operator: "in", value: propertyIds } },
        })
      : [];
    const propertiesById = Object.fromEntries(
      properties.map((property) => [property.id, property]),
    );

    const [refundRows, maintenanceRows, arrearsRows] = await Promise.all([
      baseRefunds.getAll({
        match: { tenant_id: { operator: "in", value: tenantIds } },
      }),
      maintenanceRepo.getAll({
        match: { unit_id: { operator: "in", value: unitIds } },
      }),
      arrearsRepo.getAll({
        match: { tenant_id: { operator: "in", value: tenantIds } },
      }),
    ]);

    const refundByTenant = Object.fromEntries(
      refundRows.map((refund) => [refund.tenant_id, refund]),
    );

    const tenantFaultByUnit = {};
    maintenanceRows
      .filter((m) => m.is_tenant_fault === true || m.is_tenant_fault === "true")
      .forEach((m) => {
        const cost = Number(
          m.actual_cost ?? m.estimated_cost ?? m.amount ?? 0,
        );
        tenantFaultByUnit[m.unit_id] =
          (tenantFaultByUnit[m.unit_id] || 0) + cost;
      });

    const arrearsByTenant = {};
    arrearsRows.filter(isOpenArrear).forEach((a) => {
      arrearsByTenant[a.tenant_id] =
        (arrearsByTenant[a.tenant_id] || 0) + arrearsBalance(a);
    });

    return tenants.map((t) => {
      const unit = unitsById[t.unit_id];
      const property = propertiesById[unit?.property_id];
      const refund = refundByTenant[t.id] || {};
      const deposit = Number(unit?.deposit_amount || 0);
      const faultDeductions = tenantFaultByUnit[t.unit_id] || 0;
      const arrearsDeductions = arrearsByTenant[t.id] || 0;
      const deductions = faultDeductions + arrearsDeductions;
      const refunded = Number(refund.amount_refunded || 0);
      // Net refund the tenant is owed (or 0 if deductions exceed deposit).
      const netRefund = Math.max(0, deposit - deductions);
      // What's still owed to them after any payments already recorded.
      const outstanding = Math.max(0, netRefund - refunded);

      return {
        refund_id: refund.id || null,
        tenant_id: t.id,
        tenant_name: t.full_name,
        unit_id: t.unit_id,
        unit_number: unit?.unit_number,
        block_id: unit?.block_id || null,
        property_id: unit?.property_id,
        property_name: property?.name,
        lease_start: t.lease_start,
        lease_end_date: refund.lease_end_date || null,
        total_deposit: deposit,
        fault_deductions: faultDeductions,
        arrears_deductions: arrearsDeductions,
        deductions,
        net_refund: netRefund,
        amount_refunded: refunded,
        outstanding_refund: outstanding,
        status: refund.status || "pending",
        notes: refund.notes || "",
      };
    });
  },

  /**
   * Snapshot for the "Process" action. Pulls payments + arrears for the
   * tenant so the UI can show what was deducted and why before committing.
   */
  async getTenantSummary(tenantId) {
    const [arrears, payments] = await Promise.all([
      arrearsRepo.getAll({
        match: { tenant_id: tenantId },
        order: { column: "month", ascending: true },
      }),
      paymentsRepo.getAll({
        match: { tenant_id: tenantId },
        order: { column: "payment_date", ascending: true },
      }),
    ]);

    const openArrears = arrears.filter(isOpenArrear);
    const arrearsTotal = openArrears.reduce(
      (sum, a) => sum + arrearsBalance(a),
      0,
    );
    const paymentsTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    return {
      arrears: openArrears.map((a) => ({
        id: a.id,
        month: a.month,
        amount_due: Number(a.amount_due || 0),
        amount_paid: Number(a.amount_paid || 0),
        balance: arrearsBalance(a),
        status: a.status,
      })),
      arrears_total: arrearsTotal,
      payments_total: paymentsTotal,
      payments_count: payments.length,
    };
  },

  /**
   * Process a refund. Locks in the computed deductions, records the net
   * payout, frees the unit, and (best-effort) zeros out the open arrears
   * the deposit was used to cover. Idempotent on the unit-vacant side.
   */
  async process(row) {
    if (!row?.tenant_id) throw new Error("Refund: tenant_id is required");

    const summary = await this.getTenantSummary(row.tenant_id);
    const deposit = Number(row.total_deposit || 0);
    const faultDeductions = Number(row.fault_deductions || 0);
    const deductions = faultDeductions + summary.arrears_total;
    const netRefund = Math.max(0, deposit - deductions);

    // 1. Persist the refund snapshot.
    const payload = {
      lease_end_date:
        row.lease_end_date || new Date().toISOString().split("T")[0],
      amount_refunded: netRefund,
      status: "processed",
      notes:
        row.notes ||
        `Arrears ${summary.arrears_total.toLocaleString()} + maintenance ${faultDeductions.toLocaleString()} deducted from KSh ${deposit.toLocaleString()} deposit.`,
    };
    await this.recordPayment(row.tenant_id, row.unit_id, payload);

    // 2. Cancel the lease — mark the tenant inactive AND detach any portal
    // user account. Processing a refund is the final step of a tenant's
    // exit, so this is part of the same operation; no separate "Cancel
    // Lease" click required. Unsetting user_id revokes portal access — the
    // session guard requires a tenant.userId match to authorize requests.
    try {
      await tenantsRepo.update(row.tenant_id, {
        status: "inactive",
        user_id: null,
      });
    } catch (err) {
      console.warn("Refunds.process: failed to mark tenant inactive", err);
    }

    // 3. Free the unit so it's available for the next tenant.
    if (row.unit_id) {
      try {
        await unitsRepo.update(row.unit_id, { status: "vacant" });
      } catch (err) {
        console.warn("Refunds.process: failed to mark unit vacant", err);
      }
    }

    // 4. Close out open arrears the deposit was used to settle.
    if (summary.arrears.length) {
      await Promise.all(
        summary.arrears.map((a) =>
          arrearsRepo
            .update(a.id, { amount_paid: a.amount_due, status: "paid" })
            .catch((err) => {
              console.warn(`Refunds.process: failed to close arrears ${a.id}`, err);
            }),
        ),
      );
    }

    return {
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      property_name: row.property_name,
      unit_number: row.unit_number,
      lease_end_date: payload.lease_end_date,
      total_deposit: deposit,
      fault_deductions: faultDeductions,
      arrears_deductions: summary.arrears_total,
      arrears_items: summary.arrears,
      deductions,
      net_refund: netRefund,
      processed_at: new Date().toISOString(),
    };
  },

  /** Upsert the refund record (one per tenant). */
  async recordPayment(tenantId, unitId, payload) {
    const [existing] = await baseRefunds.getAll({
      match: { tenant_id: tenantId },
      limit: 1,
    });
    const data = { tenant_id: tenantId, unit_id: unitId, ...payload };

    if (existing?.id) {
      return baseRefunds.update(existing.id, data);
    }
    return baseRefunds.create(data);
  },
};
