import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import type { TenantContext } from "../tenancy/tenant-context";
import { EntitlementsService } from "./entitlements.service";
import { REQUIRED_ADDONS_KEY } from "./addons.decorator";

type AddonRequest = Request & {
  tenant?: TenantContext;
};

@Injectable()
export class AddonsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ADDONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!required.length) return true;

    const request = context.switchToHttp().getRequest<AddonRequest>();
    const organizationId = request.tenant?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException("Add-on context is missing");
    }

    const allowed = await this.entitlements.hasAddons(organizationId, required);
    if (!allowed) {
      throw new ForbiddenException("This add-on is not enabled for this organization");
    }

    return true;
  }
}
