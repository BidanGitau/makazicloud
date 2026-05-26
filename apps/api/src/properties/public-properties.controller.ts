import { BadRequestException, Controller, Get, Header, Param, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { PropertiesService } from "./properties.service";

const MAX_TAKE = 100;
const DEFAULT_TAKE = 50;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function parseTake(raw?: string): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_TAKE) {
    throw new BadRequestException(`'take' must be an integer between 1 and ${MAX_TAKE}`);
  }
  return value;
}

function parseCursor(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (!CURSOR_PATTERN.test(raw)) {
    throw new BadRequestException("'cursor' is not a valid identifier");
  }
  return raw;
}

@Controller("public/properties")
@UseGuards(ThrottlerGuard)
@Throttle({ "public-listings": { limit: 120, ttl: 60_000 } })
export class PublicPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()


  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  async findAll(
    @Query("take") take?: string,
    @Query("cursor") cursor?: string,
  ) {
    const { items, nextCursor } = await this.propertiesService.findPublicListings({
      take: parseTake(take) ?? DEFAULT_TAKE,
      cursor: parseCursor(cursor),
    });

    return { properties: items, nextCursor };
  }

  @Get(":id")
  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  async findOne(@Param("id") id: string) {
    if (!CURSOR_PATTERN.test(id)) {
      throw new BadRequestException("'id' is not a valid identifier");
    }
    return this.propertiesService.findPublicDetails(id);
  }
}
