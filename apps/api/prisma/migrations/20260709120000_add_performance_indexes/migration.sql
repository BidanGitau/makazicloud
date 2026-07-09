CREATE INDEX "utility_bills_organizationId_billing_month_idx"
ON "utility_bills"("organizationId", "billing_month");

CREATE INDEX "utility_bills_property_id_billing_month_idx"
ON "utility_bills"("property_id", "billing_month");

CREATE INDEX "payments_organizationId_payment_date_idx"
ON "payments"("organizationId", "payment_date");

CREATE INDEX "arrears_organizationId_month_idx"
ON "arrears"("organizationId", "month");

CREATE INDEX "arrears_organizationId_status_due_date_idx"
ON "arrears"("organizationId", "status", "due_date");

CREATE INDEX "maintenance_requests_organizationId_status_idx"
ON "maintenance_requests"("organizationId", "status");

CREATE INDEX "maintenance_requests_organizationId_created_at_idx"
ON "maintenance_requests"("organizationId", "created_at");
