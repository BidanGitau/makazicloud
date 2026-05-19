import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findPublicListings({
    take,
    cursor,
  }: { take?: number; cursor?: string } = {}) {
    // Cap page size — anonymous endpoint, no auth, so an unbounded `take`
    // would let a single scraper pull the entire dataset in one request.
    const pageSize = Math.min(Math.max(take ?? 50, 1), 100);

    // Explicit field selection. `include` would fetch sensitive Property
    // fields (paymentInfo, recurringBills, ownerName, userId) into memory
    // where a future map-spread tweak could leak them.
    const properties = await this.prisma.property.findMany({
      where: {
        organization: {
          status: "ACTIVE",
          publicListingsEnabled: true,
        },
        // Only surface properties that actually have something to offer —
        // a fully-occupied building has no place on a marketing feed.
        units: {
          some: {
            status: { in: ["Vacant", "vacant", "Available", "available"] },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        address: true,
        unitCount: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
        units: {
          select: { id: true, type: true, status: true },
        },
      },
    });

    const hasMore = properties.length > pageSize;
    const page = hasMore ? properties.slice(0, pageSize) : properties;

    return {
      items: page.map((property) => {
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
          organization: {
            id: property.organization.id,
            name: property.organization.name,
            slug: property.organization.slug,
          },
        };
      }),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async findPublicDetails(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        organization: {
          status: "ACTIVE",
          publicListingsEnabled: true,
        },
        units: {
          some: {
            status: { in: ["Vacant", "vacant", "Available", "available"] },
          },
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        unitCount: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
        blocks: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        units: {
          where: {
            status: { in: ["Vacant", "vacant", "Available", "available"] },
          },
          orderBy: { unitNumber: "asc" },
          select: {
            id: true,
            unitNumber: true,
            type: true,
            floor: true,
            rentAmount: true,
            depositAmount: true,
            status: true,
            blockId: true,
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
        organization: {
          id: property.organization.id,
          name: property.organization.name,
          slug: property.organization.slug,
        },
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
