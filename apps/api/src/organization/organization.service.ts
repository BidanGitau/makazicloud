import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

const DEFAULT_BRAND_NAME = "MakaziCloud Property Management";
const MAX_LOGO_DATA_URL_LENGTH = 700_000;

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranding(tenant: TenantContext) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      select: {
        name: true,
        institutionName: true,
        logoDataUrl: true,
      },
    });

    return this.toBranding(organization);
  }

  async updateBranding(
    tenant: TenantContext,
    input: {
      name?: string;
      institutionName?: string | null;
      logoDataUrl?: string | null;
    },
  ) {
    const name = this.cleanText(input.name, "Organization name", 120);
    const institutionName = this.cleanOptionalText(
      input.institutionName,
      "Institution name",
      160,
    );
    const logoDataUrl = this.cleanLogo(input.logoDataUrl);

    const organization = await this.prisma.organization.update({
      where: { id: tenant.organizationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(institutionName !== undefined ? { institutionName } : {}),
        ...(logoDataUrl !== undefined ? { logoDataUrl } : {}),
      },
      select: {
        name: true,
        institutionName: true,
        logoDataUrl: true,
      },
    });

    return this.toBranding(organization);
  }

  private toBranding(
    organization?: {
      name: string;
      institutionName: string | null;
      logoDataUrl: string | null;
    } | null,
  ) {
    const name = organization?.name?.trim() || DEFAULT_BRAND_NAME;
    const institutionName = organization?.institutionName?.trim() || name;
    return {
      name,
      institutionName,
      displayName: institutionName || name || DEFAULT_BRAND_NAME,
      logoDataUrl: organization?.logoDataUrl || null,
      hasCustomLogo: Boolean(organization?.logoDataUrl),
    };
  }

  private cleanText(value: unknown, label: string, maxLength: number) {
    if (value === undefined) return undefined;
    const trimmed = String(value || "").trim();
    if (!trimmed) throw new BadRequestException(`${label} is required`);
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${label} must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }

  private cleanOptionalText(value: unknown, label: string, maxLength: number) {
    if (value === undefined) return undefined;
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${label} must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }

  private cleanLogo(value: unknown) {
    if (value === undefined) return undefined;
    const logo = String(value || "").trim();
    if (!logo) return null;
    if (logo.length > MAX_LOGO_DATA_URL_LENGTH) {
      throw new BadRequestException("Logo file is too large");
    }
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(logo)) {
      throw new BadRequestException("Logo must be a PNG, JPG, or WEBP image");
    }
    return logo;
  }
}
