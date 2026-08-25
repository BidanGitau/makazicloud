ALTER TABLE "organization_sms_configs"
ADD COLUMN "sms_units_balance" INTEGER,
ADD COLUMN "last_top_up_amount" DECIMAL(12, 2),
ADD COLUMN "last_top_up_sms_units" INTEGER,
ADD COLUMN "last_top_up_at" TIMESTAMP(3);
