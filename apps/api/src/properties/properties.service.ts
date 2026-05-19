import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePublicTenant({
    organizationId,
    organizationSlug,
  }: {
    organizationId?: string;
    organizationSlug?: string;
  }): Promise<TenantContext> {
    // Require explicit tenant context — the old "first active org" fallback
    // silently exposed one organization's data to unscoped requests, which is
    // unsafe in multi-tenant deployments.
    if (!organizationId && !organizationSlug) {
      throw new BadRequestException(
        "Tenant context is required. Send x-organization-id or x-tenant-slug.",
      );
    }

    const organization = await this.prisma.organization.findFirst({
      where: {
        status: "ACTIVE",
        ...(organizationId ? { id: organizationId } : {}),
        ...(organizationSlug ? { slug: organizationSlug } : {}),
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!organization) {
      throw new NotFoundException("No active public organization was found.");
    }

    return {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    };
  }

  findAll(tenant: TenantContext) {
    return this.prisma.property.findMany({
      where: {
        organizationId: tenant.organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        blocks: {
          orderBy: { name: "asc" },
        },
      },
    });
  }

  async findPublicListings(tenant: TenantContext) {
    const properties = await this.prisma.property.findMany({
      where: {
        organizationId: tenant.organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        units: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });

    return properties.map((property) => {
      const vacantUnits = property.units.filter((unit) =>
        ["vacant", "available"].includes(String(unit.status || "").toLowerCase()),
      );

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        totalUnits: property.units.length || property.unitCount || 0,
        vacantUnits: vacantUnits.length,
        occupiedUnits: Math.max(0, property.units.length - vacantUnits.length),
        availableUnitTypes: [...new Set(vacantUnits.map((unit) => unit.type).filter(Boolean))],
      };
    });
  }

  async findPublicDetails(tenant: TenantContext, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: tenant.organizationId,
      },
      include: {
        blocks: {
          orderBy: { name: "asc" },
        },
        units: {
          where: {
            status: { in: ["Vacant", "vacant", "Available", "available"] },
          },
          orderBy: { unitNumber: "asc" },
          include: {
            block: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException("This property is not currently listed.");
    }

    const unitTypes = [...new Set(property.units.map((unit) => unit.type).filter(Boolean))];

    return {
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
        totalUnits: property.unitCount || property.units.length,
        vacantUnitsInProperty: property.units.length,
        unitTypes,
        blocksCount: property.blocks.length,
      },
      units: property.units.map((unit) => ({
        id: unit.id,
        unitNumber: unit.unitNumber,
        unit_number: unit.unitNumber,
        type: unit.type,
        floor: unit.floor,
        rentAmount: unit.rentAmount,
        rent_amount: unit.rentAmount,
        depositAmount: unit.depositAmount,
        deposit_amount: unit.depositAmount,
        status: unit.status,
        blockId: unit.blockId,
        block_id: unit.blockId,
        blockName: unit.block?.name || null,
        block_name: unit.block?.name || null,
      })),
    };
  }
}
