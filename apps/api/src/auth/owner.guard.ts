import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { readSessionToken, verifySessionToken } from "./session-token";

type OwnerRequest = Request & {
  tenant?: TenantContext;
};

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const tenant = request.tenant;
    const payload = verifySessionToken(readSessionToken(request.headers.cookie));
    if (!tenant || !payload) {
      throw new ForbiddenException("Owner context is missing");
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: payload.userId,
        organizationId: tenant.organizationId,
      },
      select: { role: true },
    });

    if (membership?.role !== "OWNER") {
      throw new ForbiddenException("Only the account owner can perform this action");
    }

    return true;
  }
}
