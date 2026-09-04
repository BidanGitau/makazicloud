import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export function handlePrismaError(table: string, error: unknown): never {
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new BadRequestException(`${table} payload is invalid`);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      if (table === "owner_settlements") {
        throw new ConflictException(
          "This month has already been disbursed and cannot be amended.",
        );
      }
      throw new BadRequestException(`${table} row already exists`);
    }
    if (error.code === "P2003") {
      throw new BadRequestException(`${table} references a missing row`);
    }
  }

  throw error;
}
