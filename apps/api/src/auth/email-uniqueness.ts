import { BadRequestException, ConflictException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// Email-uniqueness invariant (relaxed model — supports the same human
// renting at multiple unrelated organizations):
//
//   1. User.email is globally unique, case-insensitive (DB index).
//   2. tenants(organizationId, LOWER(email)) is unique per-org
//      (DB index). One tenant per email per org.
//   3. A User is EITHER staff (has memberships) OR tenant (linked to
//      one or more Tenant rows). Never both — enforced here.
//   4. The same User can be linked to multiple Tenant rows when each
//      lives in a different organization. (Multi-org tenancy.)
//
// DB-level cross-table uniqueness isn't natively expressible in
// Postgres without a trigger, so the staff/tenant overlap rule is
// enforced application-side. Every write path that creates or updates
// User.email or Tenant.email must go through these helpers.

type PrismaLike = Pick<PrismaService, "user" | "tenant">;

/**
 * Called when creating a NEW staff `User` (signup, staff-invite accept).
 * Rejects if any `Tenant` row already uses this email — that would
 * eventually create the forbidden staff/tenant overlap at portal-accept
 * time. Existing-user collisions are caught by the unique DB index.
 */
export async function assertEmailFreeForUser(
  prisma: PrismaLike,
  email: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const conflictingTenant = await prisma.tenant.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true },
  });

  if (conflictingTenant) {
    throw new ConflictException(
      "This email belongs to a tenant. Staff accounts and tenant accounts can't share an email.",
    );
  }
}

/**
 * Called when creating or updating a `Tenant` row. Two checks:
 *
 *   1. No staff `User` (one with memberships) holds this email.
 *      A staff user with this email would mean the eventual portal
 *      invite for this tenant could never link without violating the
 *      no-overlap rule.
 *
 *   2. No other tenant in THIS organization holds this email. Per-org
 *      uniqueness — the same person can have a tenant row in another
 *      org with the same email, that's the multi-org tenancy case.
 */
export async function assertEmailFreeForTenant(
  prisma: PrismaLike,
  email: string,
  options: {
    organizationId: string;
    excludeTenantId?: string | null;
  },
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const staffUser = await prisma.user.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      memberships: { some: {} },
    },
    select: { id: true },
  });

  if (staffUser) {
    throw new ConflictException(
      "This email belongs to a staff user. Tenants can't share an email with a staff account.",
    );
  }

  const orgTenant = await prisma.tenant.findFirst({
    where: {
      organizationId: options.organizationId,
      email: { equals: normalized, mode: "insensitive" },
      ...(options.excludeTenantId ? { id: { not: options.excludeTenantId } } : {}),
    },
    select: { id: true },
  });

  if (orgTenant) {
    throw new ConflictException(
      "Another tenant in this organization already uses this email.",
    );
  }
}

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

// Helper for input validation — throws if the email is present but empty
// after trimming. Pass an emptyOk flag for routes where email is optional.
export function assertEmailWellFormed(
  email: string | null | undefined,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): void {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    if (allowEmpty) return;
    throw new BadRequestException("Email is required");
  }
  if (!normalized.includes("@")) {
    throw new BadRequestException("Email is not valid");
  }
}
