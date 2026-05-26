


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
