import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

for (const envPath of [join(process.cwd(), "apps/api/.env"), join(process.cwd(), ".env")]) {
  if (!process.env.DATABASE_URL && existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const RETRYABLE_DB_CODES = new Set(["P1001", "P1017"]);

function createPrismaClient() {
  const client = new PrismaClient();
  return client.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        try {
          return await query(args);
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            RETRYABLE_DB_CODES.has(error.code)
          ) {
            await client.$disconnect();
            await client.$connect();
            return query(args);
          }
          throw error;
        }
      },
    },
  });
}

const ExtendedPrismaClient = class {
  constructor() {
    return createPrismaClient() as unknown as PrismaClient;
  }
} as unknown as typeof PrismaClient;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
