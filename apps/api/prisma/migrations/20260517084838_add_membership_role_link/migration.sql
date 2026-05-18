-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "role_id" TEXT;

-- CreateIndex
CREATE INDEX "Membership_role_id_idx" ON "Membership"("role_id");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
