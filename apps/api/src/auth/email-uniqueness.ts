import { BadRequestException, ConflictException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";


type PrismaLike = Pick<PrismaService, "user" | "tenant">;


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
