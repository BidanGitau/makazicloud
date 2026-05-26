import { BadRequestException } from "@nestjs/common";


const RESERVED_SLUGS = new Set([
  "api",
  "app",
  "admin",
  "login",
  "auth",
  "static",
  "assets",
  "help",
  "docs",
  "support",
  "billing",
  "tenant",
  "tenants",
  "tenant-portal",
  "signup",
  "sign-up",
  "signin",
  "sign-in",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeOrgSlug(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


export function assertOrgSlugValid(slug: string): void {
  if (!slug) {
    throw new BadRequestException("Organization slug is required");
  }
  if (slug.length < 2 || slug.length > 40) {
    throw new BadRequestException(
      "Organization slug must be 2–40 characters long",
    );
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(
      "Organization slug can only contain lowercase letters, numbers, and hyphens",
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new BadRequestException(
      "That slug is reserved. Pick a different name.",
    );
  }
}
