import { Prisma } from "@prisma/client";

import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  PROTECTED_WRITE_FIELDS,
  READ_ONLY_ALIASES,
  TABLE_TO_MODEL,
} from "./data.constants";

export function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;
  return Number(value) || 0;
}

export function toCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnake(value: any): any {
  if (Array.isArray(value)) return value.map((item) => toSnake(item));
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  if (Prisma.Decimal.isDecimal(value)) return Number(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      toSnake(val),
    ]),
  );
}

export function toCamelDeep(value: any): any {
  if (Array.isArray(value)) return value.map((item) => toCamelDeep(item));
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => {
      const camelKey = toCamel(key);
      return [camelKey, normalizeInputValue(camelKey, toCamelDeep(val))];
    }),
  );
}

export function normalizeInputValue(key: string, value: any) {
  if (value === "" || value === undefined) return null;
  if (value === null) return null;

  if (
    typeof value === "string" &&
    /(?:Date|Month|leaseStart|advanceDate|month)$/i.test(key) &&
    /^\d{4}-\d{2}(-\d{2})?/.test(value)
  ) {
    return new Date(value.length === 7 ? `${value}-01` : value);
  }

  return value;
}

export function stripProtectedFields(data: Record<string, any>) {
  for (const field of PROTECTED_WRITE_FIELDS) {
    delete data[field];
  }
  return data;
}

export function applyPagination(args: Record<string, any>, query: Record<string, any>) {
  const requestedLimit = Number(query.limit ?? DEFAULT_LIST_LIMIT);
  const requestedOffset = Number(query.offset ?? 0);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(1, Math.floor(requestedLimit)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT;
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(0, Math.floor(requestedOffset))
    : 0;

  args.take = limit;
  if (offset > 0) args.skip = offset;
}

export function operatorToPrisma(operator: string) {
  const normalized = operator.toLowerCase();
  if (normalized === "neq") return "not";
  if (normalized === "like" || normalized === "ilike") return "contains";
  return normalized;
}

export function coerceValue(value: any, operator?: string, key?: string) {
  if (typeof value !== "string") return value;
  if (operator?.toLowerCase() === "in") {
    return value
      .split(",")
      .filter(Boolean)
      .map((item) => normalizeQueryValue(key, item));
  }
  if (value.includes(",")) return value.split(",");
  if (value === "true") return true;
  if (value === "false") return false;
  return normalizeQueryValue(key, value);
}

export function normalizeQueryValue(key: string | undefined, value: string) {
  if (
    key &&
    /(?:Date|Month|leaseStart|advanceDate|month)$/i.test(key) &&
    /^\d{4}-\d{2}(-\d{2})?/.test(value)
  ) {
    return new Date(value.length === 7 ? `${value}-01` : value);
  }

  return value;
}

export function modelNameForTable(table: string) {
  return TABLE_TO_MODEL[table] || READ_ONLY_ALIASES[table] || null;
}

export function isPrivateDataCacheable(table: string) {
  return Boolean(TABLE_TO_MODEL[table] || READ_ONLY_ALIASES[table]);
}

export function stableCachePart(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableCachePart(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${key}:${stableCachePart(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function privateCachePrefix(organizationId: string) {
  return `private:${organizationId}:`;
}
