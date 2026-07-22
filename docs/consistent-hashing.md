# Consistent Hashing Notes for MakaziCloud

Consistent hashing is useful when data or cache keys must be distributed across
multiple backend nodes and the node list can change over time. It avoids the
classic `hash(key) % server_count` problem where adding or removing one server
remaps most keys.

## Current Decision

Do not implement consistent hashing in the current MakaziCloud codebase yet.

The current cache is an in-memory, per-process TTL cache. Each PM2 API worker
keeps its own small cache and invalidates it after writes within that process.
There is no shared cache cluster, so there is no set of cache nodes to place on
a hash ring.

Adding consistent hashing now would add complexity without solving a current
production bottleneck.

## When It Becomes Useful

Consistent hashing becomes relevant when one of these is introduced:

- Redis or Memcached cluster with multiple cache nodes.
- Tenant/database sharding across multiple PostgreSQL databases.
- Object storage partitioning across buckets or regions.
- WebSocket/session fan-out where a tenant or user must consistently route to a
  backend node.
- High-volume background job workers partitioned by organization or property.

## Possible MakaziCloud Partition Keys

Use a stable business key depending on the system being partitioned:

- Cache keys: `organizationId + table + query`
- Tenant sharding: `organizationId`
- Property-heavy workloads: `organizationId + propertyId`
- Tenant portal/session routing: `organizationId + tenantId`
- Payment reconciliation jobs: `organizationId + shortcode`

For most MakaziCloud data, `organizationId` should be the first-level partition
key because tenant isolation is the strongest boundary in the application.

## Recommended Future Shape

If Redis is introduced later, start simple:

```text
cacheKey = private:{organizationId}:{table}:{queryHash}
```

For one Redis instance, no consistent hashing is needed.

If Redis is scaled to multiple independent nodes, introduce a small hash-ring
client with virtual nodes:

```text
virtualNodeKey = redis-node-name + ":" + replicaIndex
replicasPerNode = 100 to 200
selectedNode = first virtual node clockwise from hash(cacheKey)
```

Virtual nodes make key distribution smoother and reduce hotspots when nodes are
added or removed.

## Operational Rules

Use consistent hashing only when the operational model can support it:

- Nodes must have stable names.
- Clients must share the same node list.
- Adding/removing nodes must be rolled out carefully.
- Cache misses during rebalancing must be acceptable.
- Metrics must show key distribution, hit rate, memory, and hot keys.

For database sharding, consistent hashing is not enough by itself. The system
also needs migration tooling, cross-shard query rules, backup/restore plans, and
tenant move procedures.

## Practical Conclusion

For the current stage, MakaziCloud should keep using:

- Bounded in-memory cache for quick repeated reads.
- PostgreSQL indexes and query optimization.
- PM2 clustering on one VPS.
- Nginx static asset caching.

Introduce consistent hashing only after there are multiple cache/database nodes
and real metrics show that a single shared backend is the bottleneck.
