import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { getPlanAddonKeys, isAddonKey, type AddonKey } from "./addons";

export type OrganizationEntitlements = {
  addons: AddonKey[];
  flags: Record<AddonKey, boolean>;
  config: Partial<Record<AddonKey, unknown>>;
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationEntitlements(
    organizationId: string,
  ): Promise<OrganizationEntitlements> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionPlan: true,
        addons: {
          select: {
            addonKey: true,
            enabled: true,
            config: true,
          },
        },
      },
    });

    const flags = Object.fromEntries(
      getPlanAddonKeys(organization?.subscriptionPlan).map((addon) => [
        addon,
        true,
      ]),
    ) as Record<AddonKey, boolean>;
    const config: Partial<Record<AddonKey, unknown>> = {};

    for (const addon of organization?.addons || []) {
      if (!isAddonKey(addon.addonKey)) continue;
      flags[addon.addonKey] = addon.enabled;
      if (addon.config !== null && addon.config !== undefined) {
        config[addon.addonKey] = addon.config;
      }
    }

    return {
      addons: Object.entries(flags)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key as AddonKey)
        .sort(),
      flags,
      config,
    };
  }

  async hasAddons(organizationId: string, addonKeys: readonly string[]) {
    if (!addonKeys.length) return true;
    const entitlements = await this.getOrganizationEntitlements(organizationId);
    return addonKeys.every((addon) => entitlements.flags[addon as AddonKey]);
  }
}
