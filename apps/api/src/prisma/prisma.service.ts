import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

for (const envPath of [join(process.cwd(), "apps/api/.env"), join(process.cwd(), ".env")]) {
  if (!process.env.DATABASE_URL && existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
