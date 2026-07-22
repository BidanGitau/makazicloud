# MakaziCloud Scaling Estimates

These are rough back-of-the-envelope numbers for sizing the current MakaziCloud
architecture. They are intentionally approximate; update the assumptions with
real production metrics as traffic grows.

## Current Scaling Shape

The application is a multi-tenant property-management SaaS with:

- React Router web app served by Node.
- NestJS API served by Node.
- PostgreSQL through Prisma.
- Nginx reverse proxy.
- Short-lived in-memory API cache for read-heavy private data.
- Longer in-memory/API/browser cache for public listings.

The system is read-heavy: most menu navigation loads properties, units, tenants,
payments, arrears, reports, and dashboard summaries. Writes are less frequent
and invalidate the private organization cache.

## Assumptions

Small production stage:

- 100 active organizations.
- 5 users per organization.
- 500 monthly active users.
- 100 daily active users.
- Each active user opens 8 menu pages per day.
- Each menu page makes 3 API reads on average.
- Peak traffic is 5x average traffic.

Growth stage:

- 5,000 active organizations.
- 5 users per organization.
- 25,000 monthly active users.
- 5,000 daily active users.
- Each active user opens 10 menu pages per day.
- Each menu page makes 4 API reads on average.
- Peak traffic is 5x average traffic.

## QPS Estimate

Small production average reads:

```text
100 users/day * 8 pages/user * 3 API reads/page = 2,400 reads/day
2,400 / 86,400 seconds = ~0.03 read QPS
Peak at 5x = ~0.15 read QPS
```

Growth stage average reads:

```text
5,000 users/day * 10 pages/user * 4 API reads/page = 200,000 reads/day
200,000 / 86,400 seconds = ~2.3 read QPS
Peak at 5x = ~12 read QPS
```

Writes are much lower. If 20% of daily users create or update 10 records:

```text
5,000 users/day * 20% * 10 writes = 10,000 writes/day
10,000 / 86,400 seconds = ~0.12 write QPS
Peak at 5x = ~0.6 write QPS
```

These numbers are well within a single tuned PostgreSQL server and a few Node
workers, assuming queries stay indexed and large report queries are controlled.

## Cache Estimate

Private API cache defaults:

- `API_PRIVATE_DATA_CACHE_TTL_MS=15000`
- `API_DASHBOARD_CACHE_TTL_MS=30000`
- `API_MEMORY_CACHE_MAX_ENTRIES=250`

If an average cached response is 50 KB:

```text
250 entries * 50 KB = 12,500 KB = ~12 MB per API process
```

If some report/dashboard responses are larger, for example 250 KB:

```text
250 entries * 250 KB = 62,500 KB = ~61 MB per API process
```

With 2 API workers, budget roughly 25 MB to 125 MB for the in-memory cache,
depending on response sizes. This is acceptable for a VPS as long as the max
entry count remains bounded.

## Storage Estimate

Typical records are small compared with uploaded documents or images.

Example growth-stage operational data:

```text
5,000 orgs * 50 units/org = 250,000 units
5,000 orgs * 50 tenants/org = 250,000 tenants
250,000 tenants * 12 arrear rows/year = 3,000,000 arrear rows/year
250,000 tenants * 12 payment rows/year = 3,000,000 payment rows/year
```

If each row averages 1 KB including indexes and overhead:

```text
6,000,000 rows/year * 1 KB = ~6 GB/year
```

PostgreSQL can handle this comfortably with correct indexes, regular vacuuming,
and report queries that use date/org/property filters.

Uploaded/generated files are the bigger long-term storage risk. PDFs, contracts,
logos, and property images should eventually move to object storage instead of
database fields or local disk.

## Practical Conclusions

Current no-Redis optimizations are appropriate for the next stage:

- In-memory cache is enough for repeat menu navigation and dashboard refreshes.
- PM2 cluster mode can use multiple CPU cores.
- Nginx static caching reduces repeated asset transfer.
- PostgreSQL indexing matters more than distributed architecture right now.

Watch these metrics before introducing Redis or read replicas:

- API p95 latency above 500 ms for normal menu reads.
- Dashboard/report p95 latency above 1 second.
- PostgreSQL CPU consistently above 70%.
- PostgreSQL connection count near its configured limit.
- Cache memory above the process budget.
- Slow query log repeatedly showing the same report/dashboard queries.

Next scaling steps, in order:

1. Add query timing logs for slow API requests.
2. Add Postgres slow-query logging and inspect `EXPLAIN ANALYZE`.
3. Add materialized summaries for monthly dashboard/report data.
4. Move generated files/uploads to object storage.
5. Add Redis only when multi-process/multi-server cache consistency matters.
6. Add read replicas only after reads, not writes, become the database bottleneck.

See [Consistent Hashing Notes](./consistent-hashing.md) before adding a
multi-node cache, tenant sharding, or other partitioned storage.
