import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import {
  dueArrearSql,
  parseQueryDate,
  propertyFilterSql,
} from "./data.dates";
import { toNumber } from "./data.mappers";

@Injectable()
export class DataDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  async listOverview(tenant: TenantContext, query: Record<string, any>) {
    const propertyId = query.property_id || query.propertyId;
    const blockId = query.block_id || query.blockId;
    const startDate = parseQueryDate(query.start_date || query.startDate);
    const endDate = parseQueryDate(query.end_date || query.endDate, true);
    const propertyFilter = propertyFilterSql("p", tenant, propertyId);
    if (!propertyFilter) return [];

    const arrearMonthFilter = Prisma.sql`
      ${startDate ? Prisma.sql`AND a.month >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND a.month <= ${endDate}` : Prisma.empty}
    `;
    const arrearDueFilter = dueArrearSql("a", startDate, endDate);
    const blockFilter = blockId ? Prisma.sql`AND u.block_id = ${blockId}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      WITH scoped_properties AS (
        SELECT p.id, p.name
        FROM properties p
        WHERE p."organizationId" = ${tenant.organizationId}
          ${propertyFilter}
      ),
      unit_stats AS (
        SELECT
          u.property_id,
          COUNT(DISTINCT u.id)::int AS total_units,
          COUNT(DISTINCT CASE
            WHEN LOWER(COALESCE(u.status, '')) = 'occupied'
              OR LOWER(COALESCE(t.status, '')) = 'active'
            THEN u.id
          END)::int AS occupied_units,
          COUNT(DISTINCT CASE
            WHEN LOWER(COALESCE(t.status, '')) = 'active'
            THEN t.id
          END)::int AS active_tenants
        FROM units u
        LEFT JOIN tenants t
          ON t.unit_id = u.id
         AND t."organizationId" = u."organizationId"
         AND LOWER(COALESCE(t.status, '')) = 'active'
        WHERE u."organizationId" = ${tenant.organizationId}
          ${blockFilter}
        GROUP BY u.property_id
      ),
      payment_stats AS (
        SELECT
          u.property_id,
          COALESCE(SUM(
            CASE
              WHEN LOWER(COALESCE(a.status, '')) = 'prepaid' THEN 0
              ELSE a.amount_paid
            END
          ), 0)::numeric AS total_collected
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN scoped_properties sp ON sp.id = u.property_id
        WHERE a."organizationId" = ${tenant.organizationId}
          AND LOWER(COALESCE(a.status, '')) <> 'waived'
          ${arrearMonthFilter}
          ${blockFilter}
        GROUP BY u.property_id
      ),
      arrear_stats AS (
        SELECT
          u.property_id,
          COALESCE(SUM(GREATEST(0, a.amount_due - a.amount_paid)), 0)::numeric AS total_outstanding
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN scoped_properties sp ON sp.id = u.property_id
        WHERE a."organizationId" = ${tenant.organizationId}
          AND a.status IN ('pending', 'partial')
          ${arrearDueFilter}
          ${blockFilter}
        GROUP BY u.property_id
      )
      SELECT
        sp.id AS property_id,
        sp.name AS property_name,
        COALESCE(us.total_units, 0)::int AS total_units,
        COALESCE(us.active_tenants, 0)::int AS active_tenants,
        COALESCE(us.occupied_units, 0)::int AS occupied_units,
        CASE
          WHEN COALESCE(us.total_units, 0) > 0
          THEN (COALESCE(us.occupied_units, 0)::numeric / us.total_units::numeric) * 100
          ELSE 0
        END AS occupancy_rate,
        COALESCE(ps.total_collected, 0)::numeric AS total_collected,
        COALESCE(asx.total_outstanding, 0)::numeric AS total_outstanding,
        CASE
          WHEN COALESCE(ps.total_collected, 0) + COALESCE(asx.total_outstanding, 0) > 0
          THEN (COALESCE(ps.total_collected, 0) / (COALESCE(ps.total_collected, 0) + COALESCE(asx.total_outstanding, 0))) * 100
          ELSE 0
        END AS collection_rate
      FROM scoped_properties sp
      LEFT JOIN unit_stats us ON us.property_id = sp.id
      LEFT JOIN payment_stats ps ON ps.property_id = sp.id
      LEFT JOIN arrear_stats asx ON asx.property_id = sp.id
      ORDER BY sp.name ASC
    `;

    return rows.map((row) => ({
      property_id: row.property_id,
      property_name: row.property_name,
      total_units: Number(row.total_units || 0),
      active_tenants: Number(row.active_tenants || 0),
      occupied_units: Number(row.occupied_units || 0),
      occupancy_rate: toNumber(row.occupancy_rate),
      total_collected: toNumber(row.total_collected),
      total_outstanding: toNumber(row.total_outstanding),
      collection_rate: toNumber(row.collection_rate),
    }));
  }

  async listBundle(tenant: TenantContext, query: Record<string, any>) {
    const overview = await this.listOverview(tenant, query);
    const startDate = parseQueryDate(query.start_date || query.startDate);
    const endDate = parseQueryDate(query.end_date || query.endDate, true);
    const propertyId = query.property_id || query.propertyId;
    const propertyFilter = propertyFilterSql("p", tenant, propertyId);
    if (!propertyFilter) {
      return {
        overview,
        properties: [],
        available_years: [new Date().getFullYear()],
        monthly_aggregates: [],
      };
    }

    const [properties, paymentYears, arrearYears, monthlyRows] = await Promise.all([
      this.prisma.property.findMany({
        where: this.propertyAccess.scopeWhere("properties", tenant, {
          organizationId: tenant.organizationId,
          ...(propertyId ? { id: propertyId } : {}),
        }),
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM a.month)::int AS year
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN properties p
          ON p.id = u.property_id
         AND p."organizationId" = u."organizationId"
        WHERE a."organizationId" = ${tenant.organizationId}
          AND LOWER(COALESCE(a.status, '')) <> 'waived'
          AND a.amount_paid > 0
          ${propertyFilter}
      `,
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM a.month)::int AS year
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN properties p
          ON p.id = u.property_id
         AND p."organizationId" = u."organizationId"
        WHERE a."organizationId" = ${tenant.organizationId}
          AND a.status IN ('pending', 'partial')
          ${dueArrearSql("a")}
          ${propertyFilter}
      `,
      this.prisma.$queryRaw<any[]>`
        WITH scoped_properties AS (
          SELECT p.id
          FROM properties p
          WHERE p."organizationId" = ${tenant.organizationId}
            ${propertyFilter}
        ),
        month_stats AS (
          SELECT
            u.property_id,
            EXTRACT(YEAR FROM a.month)::int AS year,
            (EXTRACT(MONTH FROM a.month)::int - 1) AS month,
            COALESCE(SUM(
              CASE
                WHEN LOWER(COALESCE(a.status, '')) = 'prepaid' THEN 0
                ELSE a.amount_paid
              END
            ), 0)::numeric AS collected,
            COALESCE(SUM(
              CASE
                WHEN a.status IN ('pending', 'partial')
                THEN GREATEST(0, a.amount_due - a.amount_paid)
                ELSE 0
              END
            ), 0)::numeric AS outstanding
          FROM arrears a
          JOIN tenants t
            ON t.id = a.tenant_id
           AND t."organizationId" = a."organizationId"
          JOIN units u
            ON u.id = t.unit_id
           AND u."organizationId" = t."organizationId"
          JOIN scoped_properties sp ON sp.id = u.property_id
          WHERE a."organizationId" = ${tenant.organizationId}
            AND LOWER(COALESCE(a.status, '')) <> 'waived'
            ${startDate ? Prisma.sql`AND a.month >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND a.month <= ${endDate}` : Prisma.empty}
          GROUP BY u.property_id, year, month
        )
        SELECT
          property_id,
          year,
          month,
          collected,
          outstanding
        FROM month_stats
        ORDER BY year DESC, month DESC
      `,
    ]);

    const yearSet = new Set<number>([new Date().getFullYear()]);
    for (const row of [...paymentYears, ...arrearYears]) {
      if (row.year) yearSet.add(Number(row.year));
    }
    const monthlyAggregates = monthlyRows.map((row) => ({
      property_id: row.property_id,
      year: Number(row.year),
      month: Number(row.month),
      collected: toNumber(row.collected),
      outstanding: toNumber(row.outstanding),
    }));

    return {
      overview,
      properties: properties.map((p) => ({ id: p.id, name: p.name })),
      available_years: [...yearSet].sort((a, b) => b - a),
      monthly_aggregates: monthlyAggregates,
    };
  }
}
