import { createCRUD } from "../../_lib/crud";
import { apiFetch } from "../../_lib/api/client";
import {
  isArrearWaivedOnLeaseCancel,
  isOpenArrearStatus,
  monthKeyFromDate,
} from "../../_lib/lease-utils";

const baseRefunds = createCRUD("refunds", {
  defaultSelect:
    "id, tenant_id, unit_id, lease_end_date, amount_refunded, status, notes, created_at",
  defaultOrder: { column: "created_at", ascending: false },
});
const tenantsRepo = createCRUD("tenants", {
  defaultSelect:
    "id, full_name, unit_id, lease_start, lease_end_date, status, billing_cycle_enabled, billing_cycle_months",
});
const unitsRepo = createCRUD("units", {
  defaultSelect: "id, property_id, block_id, unit_number, deposit_amount, status",
});
const propertiesRepo = createCRUD("properties", {
  defaultSelect: "id, name",
});
const maintenanceRepo = createCRUD("maintenance_requests", {
  defaultSelect:
    "id, property_id, unit_id, tenant_id, amount, actual_cost, estimated_cost, is_tenant_fault",
});
const arrearsRepo = createCRUD("arrears", {
  defaultSelect: "id, tenant_id, month, amount_due, amount_paid, status",
});
const paymentsRepo = createCRUD("payments", {
  defaultSelect: "id, tenant_id, amount, payment_date, method, reference",
});

const arrearsBalance = (a) =>
  Math.max(0, Number(a?.amount_due || 0) - Number(a?.amount_paid || 0));

const isOpenArrear = (a) => isOpenArrearStatus(a?.status);

const sortByMonth = (rows) =>
  [...rows].sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));

const DEDUCTIONS_NOTE_PREFIX = "Manual deductions:";

const parseManualDeductions = (notes) => {
  const text = String(notes || "");
  const line = text
    .split("\n")
    .find((item) => item.startsWith(DEDUCTIONS_NOTE_PREFIX));
  if (!line) return [];

  try {
    const parsed = JSON.parse(line.slice(DEDUCTIONS_NOTE_PREFIX.length).trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        label: String(item?.label || "").trim(),
        amount: Number(item?.amount || 0),
      }))
      .filter((item) => item.label && item.amount > 0);
  } catch {
    return [];
  }
};

export const Refunds = {
  ...baseRefunds,

  async getWithDetails({ propertyId, tenantStatus = "inactive" } = {}) {
    const statusMatch =
      tenantStatus && tenantStatus !== "all" ? { status: tenantStatus } : {};
    const allTenants = await tenantsRepo.getAll({ match: statusMatch });
    if (!allTenants.length) return [];

    const candidateUnitIds = [
      ...new Set(allTenants.map((tenant) => tenant.unit_id).filter(Boolean)),
    ];
    const units = candidateUnitIds.length
      ? await unitsRepo.getAll({
          match: { id: { operator: "in", value: candidateUnitIds } },
        })
      : [];
    const unitsById = Object.fromEntries(units.map((unit) => [unit.id, unit]));

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
        match: { tenant_id: { operator: "in", value: tenantIds } },
      }),
      arrearsRepo.getAll({
        match: { tenant_id: { operator: "in", value: tenantIds } },
      }),
    ]);

    const refundByTenant = Object.fromEntries(
      refundRows.map((refund) => [refund.tenant_id, refund]),
    );

    const tenantFaultByTenant = {};
    maintenanceRows
      .filter((m) => m.is_tenant_fault === true || m.is_tenant_fault === "true")
      .forEach((m) => {
        const cost = Number(
          m.actual_cost ?? m.estimated_cost ?? m.amount ?? 0,
        );
        tenantFaultByTenant[m.tenant_id] =
          (tenantFaultByTenant[m.tenant_id] || 0) + cost;
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
      const manualDeductions = parseManualDeductions(refund.notes);
      const deposit = Number(unit?.deposit_amount || 0);
      const faultDeductions =
        (tenantFaultByTenant[t.id] || 0) +
        manualDeductions.reduce((sum, item) => sum + item.amount, 0);
      const manualDeductionTotal = manualDeductions.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const arrearsDeductions = arrearsByTenant[t.id] || 0;
      const deductions = faultDeductions + arrearsDeductions;
      const refunded = Number(refund.amount_refunded || 0);

      const netRefund = Math.max(0, deposit - deductions);

      const outstanding = Math.max(0, netRefund - refunded);

      return {
        refund_id: refund.id || null,
        tenant_id: t.id,
        tenant_name: t.full_name,
        tenant_status: t.status,
        unit_id: t.unit_id,
        unit_number: unit?.unit_number,
        block_id: unit?.block_id || null,
        property_id: unit?.property_id,
        property_name: property?.name,
        lease_start: t.lease_start,
        lease_end_date: t.lease_end_date || refund.lease_end_date || null,
        total_deposit: deposit,
        fault_deductions: faultDeductions,
        manual_deductions: manualDeductionTotal,
        arrears_deductions: arrearsDeductions,
        deductions,
        net_refund: netRefund,
        amount_refunded: refunded,
        outstanding_refund: outstanding,
        status: refund.status || (String(t.status || "").toLowerCase() === "inactive" ? "pending" : "n/a"),
        notes: refund.notes || "",
        deduction_items: manualDeductions,
      };
    });
  },

  async getTenantSummary(tenantId, leaseEndDate = null) {
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

    const openArrears = sortByMonth(arrears.filter(isOpenArrear));
    const waivedPreview = leaseEndDate
      ? openArrears.filter((a) => isArrearWaivedOnLeaseCancel(a, leaseEndDate))
      : [];
    const collectible = leaseEndDate
      ? openArrears.filter(
          (a) => !isArrearWaivedOnLeaseCancel(a, leaseEndDate),
        )
      : openArrears;

    const arrearsTotal = collectible.reduce(
      (sum, a) => sum + arrearsBalance(a),
      0,
    );
    const waivedTotal = waivedPreview.reduce(
      (sum, a) => sum + arrearsBalance(a),
      0,
    );
    const paymentsTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    return {
      arrears: collectible.map((a) => ({
        id: a.id,
        month: a.month,
        amount_due: Number(a.amount_due || 0),
        amount_paid: Number(a.amount_paid || 0),
        balance: arrearsBalance(a),
        status: a.status,
      })),
      arrears_total: arrearsTotal,
      waived_arrears: waivedPreview.map((a) => ({
        id: a.id,
        month: a.month,
        balance: arrearsBalance(a),
      })),
      waived_arrears_total: waivedTotal,
      payments_total: paymentsTotal,
      payments_count: payments.length,
      lease_end_month: leaseEndDate ? monthKeyFromDate(leaseEndDate) : null,
    };
  },

  async process(row) {
    if (!row?.tenant_id) throw new Error("Refund: tenant_id is required");

    const leaseEndDate =
      row.lease_end_date || new Date().toISOString().split("T")[0];
    if (!leaseEndDate) {
      throw new Error("Lease end date is required to cancel the lease.");
    }

    const payload = await apiFetch("/tenants/cancel-lease", {
      method: "POST",
      body: {
        tenant_id: row.tenant_id,
        unit_id: row.unit_id,
        lease_end_date: leaseEndDate,
        total_deposit: row.total_deposit,
        fault_deductions: row.fault_deductions,
        manual_deductions: row.manual_deductions,
        deduction_items: row.deduction_items,
        notes: row.notes,
        tenant_name: row.tenant_name,
        property_name: row.property_name,
        unit_number: row.unit_number,
      },
    });

    return payload?.tenant_id ? payload : payload?.data ?? payload;
  },

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
