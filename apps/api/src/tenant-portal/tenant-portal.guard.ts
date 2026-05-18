import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";
import { readSessionToken, verifySessionToken } from "../auth/session-token";

export type TenantPortalSession = {
  userId: string;
  tenantId: string;
  organizationId: string;
  unitId: string | null;
  propertyId: string | null;
  blockId: string | null;
  fullName: string;
  email: string | null;
  status: string;
  leaseStart: Date | null;
  rentDueDate: number | null;
  unit: {
    id: string;
    unitNumber: string | null;
    type: string | null;
    floor: string | null;
    rentAmount: number | null;
    propertyName: string | null;
    blockName: string | null;
  } | null;
};

type PortalRequest = Request & { portalSession?: TenantPortalSession };

@Injectable()
export class TenantPortalGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PortalRequest>();
    const payload = verifySessionToken(readSessionToken(request.headers.cookie));
    if (!payload) {
      throw new UnauthorizedException("Authentication is required");
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        userId: payload.userId,
        organizationId: payload.organizationId,
        status: { in: ["active", "Active"] },
      },
      include: {
        unit: {
          include: {
            property: { select: { id: true, name: true } },
            block: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!tenant) {
      throw new UnauthorizedException("Tenant portal access is required");
    }

    request.portalSession = {
      userId: payload.userId,
      tenantId: tenant.id,
      organizationId: tenant.organizationId,
      unitId: tenant.unitId || null,
      propertyId: tenant.unit?.propertyId || null,
      blockId: tenant.unit?.blockId || null,
      fullName: tenant.fullName,
      email: tenant.email,
      status: tenant.status,
      leaseStart: tenant.leaseStart,
      rentDueDate: tenant.rentDueDate,
      unit: tenant.unit
        ? {
            id: tenant.unit.id,
            unitNumber: tenant.unit.unitNumber,
            type: tenant.unit.type,
            floor: tenant.unit.floor,
            rentAmount:
              tenant.unit.rentAmount != null
                ? Number(tenant.unit.rentAmount)
                : null,
            propertyName: tenant.unit.property?.name || null,
            blockName: tenant.unit.block?.name || null,
          }
        : null,
    };

    return true;
  }
}

export const PortalSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantPortalSession => {
    const request = context.switchToHttp().getRequest<PortalRequest>();
    if (!request.portalSession) {
      throw new Error("TenantPortalGuard did not run before PortalSession");
    }
    return request.portalSession;
  },
);
