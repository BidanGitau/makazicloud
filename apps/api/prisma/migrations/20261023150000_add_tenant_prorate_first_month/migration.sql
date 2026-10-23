-- New tenants can be billed a prorated move-in month; existing tenants keep full-month billing.
ALTER TABLE "tenants"
  ADD COLUMN "prorate_first_month" BOOLEAN NOT NULL DEFAULT false,
  -- Part-month rent agreed with the tenant; null means use the day-based proration.
  ADD COLUMN "move_in_rent" DECIMAL(12,2);
