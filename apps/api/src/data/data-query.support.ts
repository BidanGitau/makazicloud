import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import { PROTECTED_QUERY_KEYS } from "./data.constants";
import {
  applyPagination,
  coerceValue,
  modelNameForTable,
  operatorToPrisma,
  toCamel,
} from "./data.mappers";

@Injectable()
export class DataQuerySupport {
  constructor(
    readonly prisma: PrismaService,
    readonly propertyAccess: PropertyAccessService,
  ) {}

  getModel(table: string) {
    const modelName = modelNameForTable(table);
    if (!modelName) throw new BadRequestException(`Unsupported table: ${table}`);

    const model = (this.prisma as any)[modelName];
    if (!model) throw new BadRequestException(`Unsupported model: ${modelName}`);
    return model;
  }

  applyPagination(args: Record<string, any>, query: Record<string, any>) {
    applyPagination(args, query);
  }

  buildWhere(table: string, tenant: TenantContext, query: Record<string, any>) {
    const where: Record<string, any> = {};

    Object.entries(query).forEach(([rawKey, value]) => {
      if (["orderBy", "order", "limit", "offset"].includes(rawKey)) return;
      if (value === undefined || value === null || value === "") return;

      const match = rawKey.match(/^(.+)\[(.+)\]$/);
      const key = toCamel(match?.[1] || rawKey);
      const operator = match?.[2];

      if (PROTECTED_QUERY_KEYS.has(key)) return;

      if (!operator) {
        where[key] = coerceValue(value, undefined, key);
        return;
      }

      where[key] = {
        ...(where[key] || {}),
        [operatorToPrisma(operator)]: coerceValue(value, operator, key),
      };
    });

    where.organizationId = tenant.organizationId;
    return this.propertyAccess.scopeWhere(table, tenant, where);
  }
}
