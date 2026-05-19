import { Controller, Get, Headers, Param } from "@nestjs/common";

import { PropertiesService } from "./properties.service";

@Controller("public/properties")
export class PublicPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async findAll(
    @Headers("x-organization-id") organizationId?: string,
    @Headers("x-tenant-slug") organizationSlug?: string,
  ) {
    const tenant = await this.propertiesService.resolvePublicTenant({
      organizationId,
      organizationSlug,
    });

    return {
      properties: await this.propertiesService.findPublicListings(tenant),
    };
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Headers("x-organization-id") organizationId?: string,
    @Headers("x-tenant-slug") organizationSlug?: string,
  ) {
    const tenant = await this.propertiesService.resolvePublicTenant({
      organizationId,
      organizationSlug,
    });

    return this.propertiesService.findPublicDetails(tenant, id);
  }
}
