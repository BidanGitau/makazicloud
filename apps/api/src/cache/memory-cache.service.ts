import { Injectable } from "@nestjs/common";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const DEFAULT_MAX_ENTRIES = 250;

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class MemoryCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly maxEntries = readPositiveInt(
    process.env.API_MEMORY_CACHE_MAX_ENTRIES,
    DEFAULT_MAX_ENTRIES,
  );

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
  ): Promise<T> {
    if (ttlMs <= 0) return load();

    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > now) return entry.value as T;

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const pending = load()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, pending);
    return pending;
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
    for (const key of this.inflight.keys()) {
      if (key.startsWith(prefix)) this.inflight.delete(key);
    }
  }

  private set<T>(key: string, value: T, ttlMs: number) {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.prune();
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
  }
}
