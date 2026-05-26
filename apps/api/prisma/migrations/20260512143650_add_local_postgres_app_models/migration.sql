ALTER TABLE "Block" DROP CONSTRAINT "Block_organizationId_fkey";
ALTER TABLE "Block" DROP CONSTRAINT "Block_propertyId_organizationId_fkey";
ALTER TABLE "Property" DROP CONSTRAINT "Proped_fkey";
ALTER TABLE "User" ADD COLUMN     "password

ropTable
DROP TABLE "Block";
DROP TABLE "Property";
"properties" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL
TEXT NOT NULL,
    "address" TEXT,
    "owner_name" TEXT,
ount" INTEGER,
    "res" JSONB,
    "payment_in
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unit_count" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMES
atedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "block_id" TEXT,
    "unit_number" TEXT NOT NULL,
    "type" TEXT,
    "floor" TEXT,
    "status" TEXT NOT Vacant',
    "rent_amount" DECIMAL(12,2),
    "deposit_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unit_id" TEXT,
    "lease_start" DATE,
    "rent_due_date" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "full_name" TEXT NOT
tional_id" TEXT,
    "emergency_contact" TEXT,
    "occupation" TEXT,
    "notes" TEXT,
    "email" TEXT,
    "billing_cycle_enabled" BOOLEAN NOT NULL DEFAULT false,
    "billing_cycle_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" TEXT,
    "reference" TEXT
" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "allocation_type" TEXT,
    "reference_id" TEXT,
    "lease_mon
"amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "arrears" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "amount_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(12,2) NT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrears_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT,
    "unit_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "amount" DECIMAL(12,2),
    "status" TEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "owner_advances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "property_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "advance_date" DATE,
    "created_at" TIMESTAMDEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_advances_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3

   CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permiRIMARY KEY ("id")
);
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  role_permissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "properties_organizationId_idx" ON "properties"("organizationId");
CREATE UNIQUE INDEX "properties_id_organizationId_key" ON "properties"("id", "organizationId");
CREATE UNIQUE INDEXrganizationId_name_key" ON "properties"("organizationId", "name");
"blocks_organizationId_idx" ON "blocks"("organizationId");
CREATE INDEX "blocks_prizationId_idx" ON "blocks"("propertyId", "organizationId");
CREATE UNIQUE INDEX "blockId_propertyId_name_key" ON "blocks"("organizationId", "propertyId", "name"

ndex
CREATE INDEX "units_organizationId_idx" ON "units"("organizationId");
CREATE Ioperty_id_organizationId_idx" ON "units"("property_id", "organizationId");
CREATE INDEX "units_block_ids"("block_id");
CREATE UNIQUE INDEX "units_organizationIunit_number_key" ON "units"("organizationId", "property_id", "unit_number");
CREATEs_organizationId_idx" ON "tenants"("organizationId");
TE INDEX "tenants_unit_id_idx" ON "tenants"("unit_id");
CREATE INDEX "payments_organizationId_idx" ON "payments"("org
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant

ateIndex
CREATE INDEX "payment_allocations_organizationId_idx"llocations"("organizationId");
CREATE INDEX "payment_allocatioidx" ON "payment_allocations"("payment_id");
CREATE _allocations_tenant_id_idx" ON "payment_allocations"("tenant_id");
CREATE INDEX "arrionId_idx" ON "arrears"("organizationId");
CREATE INDEX "arrears_tenant_id_is"("tenant_id");
CREATE INDEX "maintenance_requests_organizationId_idx" ONrequests"("organizationId");
CREATE INDEX "owner_advances_ordx" ON "owner_advances"("organizationId");
CREATE rganizationId_idx" ON "roles"("organizationId");
CREATE UNIQUE INDEX "roles_organizati ON "roles"("organizationId", "name");
CREATE INDEX "permissions_organizat"permissions"("organizationId");
CREATE UNIQUE INDEX "penizationId_name_key" ON "permissions"("organizationId", "name");
CREATE INDEsions_organizationId_idx" ON "role_permissions"("organizationId");
CNDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
ALTER TABLE "properties" ADD CONSTRAINT "properties_organizationId_fkey" FOREIGN KEY ("organiERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINzationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blockanizationId_fkey" FOREIGN KEY ("propertyId", "organizationId") REFERENCES "properties"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
As" ADD CONSTRAINT "units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_przationId_fkey" FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
As" ADD CONSTRAINT "units_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organizationId_Y ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenants" ADD CONSTRAINT "teey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT _id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_ KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_aizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pay" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arrears" ADD COs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arrears" ADD CONSTRAINT "arfkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "main_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oDD CONSTRAINT "owner_advances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roles" ADD COorganizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permissions" ADD CONSTRAINT "pezationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" Aole_permissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAIions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
