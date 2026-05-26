import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "./tenant-context";
import { readSessionToken, verifySessionToken } from "../auth/session-token";

type TenantRequest = Request & {
  tenant?: TenantContext;
};

type RejectionReason =
  | "missing_context"
  | "unknown_org"
  | "no_auth"
  | "no_membership";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const organizationId = this.readHeader(request, "x-organization-id");
    const organizationSlug = this.readHeader(request, "x-tenant-slug");

    if (!organizationId && !organizationSlug) {
      await this.recordRejection(request, "missing_context", {
        organizationId,
        organizationSlug,
      });
      throw new BadRequestException(
        "Missing tenant context. Send x-organization-id or x-tenant-slug.",
      );
    }

    const organization = await this.prisma.organization.findFirst({
      where: {
        status: "ACTIVE",
        ...(organizationId ? { id: organizationId } : { slug: organizationSlug }),
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!organization) {
      await this.recordRejection(request, "unknown_org", {
        organizationId,
        organizationSlug,
      });
      throw new NotFoundException("Tenant organization was not found");
    }

    const payload = verifySessionToken(readSessionToken(request.headers.cookie));
    if (!payload) {
      await this.recordRejection(request, "no_auth", {
        organizationId: organization.id,
        organizationSlug: organization.slug,
      });
      throw new UnauthorizedException("Authentication is required");
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: payload.userId,
        organizationId: organization.id,
      },
      select: { id: true },
    });

    if (!membership) {
      await this.recordRejection(request, "no_membership", {
        userId: payload.userId,
        organizationId: organization.id,
        organizationSlug: organization.slug,
      });
      throw new ForbiddenException("User is not a member of this organization");
    }

    request.tenant = {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    };

    return true;
  }

  private readHeader(request: Request, name: string) {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }


  private async recordRejection(
    request: TenantRequest,
    reason: RejectionReason,
    context: {
      userId?: string;
      organizationId?: string;
      organizationSlug?: string;
    },
  ): Promise<void> {
    try {
      const userId =
        context.userId ??
        verifySessionToken(readSessionToken(request.headers.cookie))?.userId ??
        null;
      const ip =
        (this.readHeader(request, "x-forwarded-for") || request.ip || "")
          .split(",")[0]
          ?.trim() || null;
      const userAgent = this.readHeader(request, "user-agent") || null;

      await this.prisma.tenantIsolationEvent.create({
        data: {
          userId,
          attemptedOrgId: context.organizationId || null,
          attemptedOrgSlug: context.organizationSlug || null,
          reason,
          method: request.method || null,
          path: request.originalUrl || request.url || null,
          ip,
          userAgent,
        },
      });
    } catch (err) {

      console.warn("TenantGuard audit log failed:", err);
    }
  }
}
