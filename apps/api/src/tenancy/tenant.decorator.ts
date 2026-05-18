import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { TenantContext } from "./tenant-context";

type TenantRequest = Request & {
  tenant?: TenantContext;
};

export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenant) {
      throw new Error("Tenant context was not attached to the request");
    }

    return request.tenant;
  },
);
