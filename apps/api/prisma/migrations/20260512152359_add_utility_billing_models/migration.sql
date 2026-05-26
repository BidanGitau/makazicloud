
CREATE TABLE "utility_unit_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "billing_type" TEXT,
    "monthly_cost" DECIMAL(12,2),
    "rate_per_unit" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_unit_assignments_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "utility_meter_readings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "service_type" TEXT,
    "billing_month" DATE NOT NULL,
    "previous_reading" DECIMAL(12,2),
    "current_reading" DECIMAL(12,2),
    "consumption" DECIMAL(12,2),
    "rate_per_unit" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "bill_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_meter_readings_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "block_id" TEXT,
    "unit_id" TEXT,
    "name" TEXT NOT NULL,
    "service_type" TEXT,
    "billing_type" TEXT,
    "rate_per_unit" DECIMAL(12,2),
    "units_consumed" DECIMAL(12,2),
    "previous_reading" DECIMAL(12,2),
    "current_reading" DECIMAL(12,2),
    "billing_month" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_date" DATE,
    "reference" TEXT,
    "assign_all" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);


CREATE INDEX "utility_unit_assignments_organizationId_idx" ON "utility_unit_assignments"("organizationId");


CREATE INDEX "utility_unit_assignments_property_id_organizationId_idx" ON "utility_unit_assignments"("property_id", "organizationId");


CREATE INDEX "utility_unit_assignments_unit_id_idx" ON "utility_unit_assignments"("unit_id");


CREATE INDEX "utility_meter_readings_organizationId_idx" ON "utility_meter_readings"("organizationId");


CREATE INDEX "utility_meter_readings_property_id_organizationId_idx" ON "utility_meter_readings"("property_id", "organizationId");


CREATE INDEX "utility_meter_readings_unit_id_idx" ON "utility_meter_readings"("unit_id");


CREATE INDEX "utility_meter_readings_bill_id_idx" ON "utility_meter_readings"("bill_id");


CREATE INDEX "utility_bills_organizationId_idx" ON "utility_bills"("organizationId");


CREATE INDEX "utility_bills_property_id_organizationId_idx" ON "utility_bills"("property_id", "organizationId");


CREATE INDEX "utility_bills_block_id_idx" ON "utility_bills"("block_id");


CREATE INDEX "utility_bills_unit_id_idx" ON "utility_bills"("unit_id");


CREATE INDEX "utility_bills_billing_month_idx" ON "utility_bills"("billing_month");


ALTER TABLE "utility_unit_assignments" ADD CONSTRAINT "utility_unit_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_unit_assignments" ADD CONSTRAINT "utility_unit_assignments_property_id_organizationId_fkey" FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_unit_assignments" ADD CONSTRAINT "utility_unit_assignments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_meter_readings" ADD CONSTRAINT "utility_meter_readings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_meter_readings" ADD CONSTRAINT "utility_meter_readings_property_id_organizationId_fkey" FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_meter_readings" ADD CONSTRAINT "utility_meter_readings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "utility_meter_readings" ADD CONSTRAINT "utility_meter_readings_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "utility_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_property_id_organizationId_fkey" FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
