import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { readSessionToken, verifySessionToken } from "./session-token";
import { resolveUserPermissions } from "./permissions";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

type PermissionRequest = Request & {
  tenant?: TenantContext;
};

const TABLE_PERMISSION_PREFIX: Record<string, string> = {
  properties: "properties",
  blocks: "units",
  units: "units",
  tenants: "tenants",
  payments: "payments",
  payment_allocations: "payments",
  arrears: "arrears",
  maintenance_requests: "maintenance",
  owner_advances: "maintenance",
  utility_unit_assignments: "utilities",
  utility_meter_readings: "utilities",
  utility_bills: "utilities",
  refunds: "payments",
  v_tenant_overview: "tenants",
  tenant_details: "tenants",
  v_arrears_with_details: "arrears",
  dashboard_total_collection: "dashboard",
  dashboard_occupancy: "dashboard",
  dashboard_monthly_collection: "dashboard",
  dashboard_property_earnings: "dashboard",
  dashboard_tenant_status: "dashboard",
  dashboard_customers_arrears: "dashboard",
  v_property_statement: "reports",
  v_property_statement_tenants: "reports",
  v_property_statement_summary: "reports",
  v_tenant_payment_overview: "reports",
  v_utility_bills_with_details: "utilities",
  v_maintenance_requests_with_details: "maintenance",
  v_owner_advances_with_details: "maintenance",
  dashboard_overview: "dashboard",
  dashboard_bundle: "dashboard",
  property_net_income: "reports",
};

const MANAGE_ONLY_PREFIXES = new Set(["arrears", "utilities", "roles"]);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PermissionRequest>();
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || this.inferDataPermissions(request);

    if (!required.length) return true;

    const tenant = request.tenant;
    const payload = verifySessionToken(readSessionToken(request.headers.cookie));
    if (!tenant || !payload) {
      throw new ForbiddenException("Permission context is missing");
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: payload.userId,
        organizationId: tenant.organizationId,
      },
      select: {
        role: true,
        roleId: true,
        organizationId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException("User is not a member of this organization");
    }

    const permissions = await resolveUserPermissions(this.prisma, membership);
    const allowed = required.every((permission) => permissions.includes(permission));

    if (!allowed) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }

  private inferDataPermissions(request: PermissionRequest) {
    const table = String(request.params?.table || "");
    const prefix = TABLE_PERMISSION_PREFIX[table];
    if (!prefix) return [];

    const method = request.method.toUpperCase();
    if (method === "GET") return [`${prefix}:view`];
    if (MANAGE_ONLY_PREFIXES.has(prefix)) return [`${prefix}:manage`];
    if (method === "POST") return [`${prefix}:create`];
    if (method === "PATCH" || method === "PUT") return [`${prefix}:edit`];
    if (method === "DELETE") return [`${prefix}:delete`];
    return [];
  }
}
