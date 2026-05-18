-- Audit table for cross-tenant access attempts.
--
-- Every time TenantGuard rejects a request (missing org header, unknown
-- org, no membership for that org), one row lands here. The table is
-- append-only, indexed by user + organization for "what is this user
-- probing?" / "who's hitting org X?" queries.
--
-- Not partitioned — at hundreds of events/day this stays small for years.
-- If volume grows, partition by created_at month.

CREATE TABLE "tenant_isolation_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "attempted_org_id" TEXT,
  "attempted_org_slug" TEXT,
  "reason" TEXT NOT NULL,
  "method" TEXT,
  "path" TEXT,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_isolation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_isolation_events_user_id_idx"
  ON "tenant_isolation_events"("user_id");

CREATE INDEX "tenant_isolation_events_attempted_org_id_idx"
  ON "tenant_isolation_events"("attempted_org_id");

CREATE INDEX "tenant_isolation_events_created_at_idx"
  ON "tenant_isolation_events"("created_at");
