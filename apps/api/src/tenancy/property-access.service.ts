import { ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "./tenant-context";

const DIRECT_PROPERTY_TABLES = new Set([
  "blocks",
  "units",
  "utility_unit_assignments",
  "utility_meter_readings",
  "utility_bills",
  "owner_advances",
  "owner_settlements",
]);

const TENANT_PROPERTY_TABLES = new Set([
  "tenants",
  "payments",
  "payment_allocations",
  "arrears",
]);

const SCOPE_TABLE_ALIASES: Record<string, string> = {
  v_tenant_overview: "tenants",
  tenant_details: "tenants",
  v_arrears_with_details: "arrears",
  dashboard_total_collection: "payments",
  dashboard_monthly_collection: "payments",
  dashboard_property_earnings: "payments",
  dashboard_tenant_status: "tenants",
  dashboard_customers_arrears: "arrears",
  v_property_statement: "payments",
  v_property_statement_tenants: "payments",
  v_property_statement_summary: "payments",
  v_tenant_payment_overview: "payments",
  v_utility_bills_with_details: "utility_bills",
  v_maintenance_requests_with_details: "maintenance_requests",
  v_owner_advances_with_details: "owner_advances",
};

@Injectable()
export class PropertyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  hasAllProperties(tenant: TenantContext) {
    return tenant.role === "OWNER" || tenant.propertyAccessScope === "ALL";
  }

  scopedPropertyIds(tenant: TenantContext, requestedPropertyId?: string | null) {
    if (this.hasAllProperties(tenant)) {
      return requestedPropertyId ? [requestedPropertyId] : null;
    }

    const allowed = new Set(tenant.propertyIds || []);
    if (requestedPropertyId) {
      return allowed.has(requestedPropertyId) ? [requestedPropertyId] : [];
    }

    return [...allowed];
  }

  scopeWhere(table: string, tenant: TenantContext, where: Record<string, any>) {
    if (this.hasAllProperties(tenant)) return where;

    const ids = tenant.propertyIds || [];
    const scope = this.scopeClause(SCOPE_TABLE_ALIASES[table] || table, ids);
    if (!scope) return where;
    return { AND: [where, scope] };
  }

  async assertWritableReferences(
    tenant: TenantContext,
    data: Record<string, any>,
  ) {
    if (this.hasAllProperties(tenant)) return;

    if (data.propertyId) {
      this.assertPropertyIdAllowed(tenant, data.propertyId);
    }

    if (data.blockId) {
      const block = await this.prisma.block.findFirst({
        where: { id: data.blockId, organizationId: tenant.organizationId },
        select: { propertyId: true },
      });
      if (!block) throw new ForbiddenException("Selected block is not available");
      this.assertPropertyIdAllowed(tenant, block.propertyId);
    }

    if (data.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: data.unitId, organizationId: tenant.organizationId },
        select: { propertyId: true },
      });
      if (!unit) throw new ForbiddenException("Selected unit is not available");
      this.assertPropertyIdAllowed(tenant, unit.propertyId);
    }

    if (data.tenantId) {
      const tenantRow = await this.prisma.tenant.findFirst({
        where: { id: data.tenantId, organizationId: tenant.organizationId },
        select: { unit: { select: { propertyId: true } } },
      });
      if (!tenantRow?.unit?.propertyId) {
        throw new ForbiddenException("Selected tenant is not available");
      }
      this.assertPropertyIdAllowed(tenant, tenantRow.unit.propertyId);
    }

    if (data.paymentId) {
      const payment = await this.prisma.payment.findFirst({
        where: { id: data.paymentId, organizationId: tenant.organizationId },
        select: {
          tenant: { select: { unit: { select: { propertyId: true } } } },
        },
      });
      if (!payment?.tenant?.unit?.propertyId) {
        throw new ForbiddenException("Selected payment is not available");
      }
      this.assertPropertyIdAllowed(tenant, payment.tenant.unit.propertyId);
    }
  }

  assertPropertyIdAllowed(tenant: TenantContext, propertyId: string) {
    if (this.hasAllProperties(tenant)) return;
    if ((tenant.propertyIds || []).includes(propertyId)) return;
    throw new ForbiddenException("You do not have access to this property");
  }

  private scopeClause(table: string, propertyIds: string[]) {
    if (table === "properties") return { id: { in: propertyIds } };
    if (DIRECT_PROPERTY_TABLES.has(table)) {
      return { propertyId: { in: propertyIds } };
    }
    if (table === "tenants") {
      return { unit: { propertyId: { in: propertyIds } } };
    }
    if (TENANT_PROPERTY_TABLES.has(table)) {
      return { tenant: { unit: { propertyId: { in: propertyIds } } } };
    }
    if (table === "refunds") {
      return {
        OR: [
          { unit: { propertyId: { in: propertyIds } } },
          { tenant: { unit: { propertyId: { in: propertyIds } } } },
        ],
      };
    }
    if (table === "maintenance_requests") {
      return {
        OR: [
          { propertyId: { in: propertyIds } },
          { unit: { propertyId: { in: propertyIds } } },
          { tenant: { unit: { propertyId: { in: propertyIds } } } },
        ],
      };
    }
    return null;
  }
}
