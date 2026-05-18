/**
 * Backfill default roles + permissions for every existing organization.
 * Run once: `pnpm ts-node apps/api/scripts/backfill-org-roles.ts` (or
 * via `tsx`). Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

import { seedOrganizationRoles } from "../src/auth/permissions";

async function main() {
  const prisma = new PrismaClient();

  const orgs = await prisma.organization.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  console.log(`Backfilling ${orgs.length} organization(s)...`);

  for (const org of orgs) {
    const adminRoleId = await seedOrganizationRoles(prisma, org.id);

    // Make sure the org's OWNER gets the Admin role if they don't have one.
    const owner = await prisma.membership.findFirst({
      where: { organizationId: org.id, role: "OWNER" },
    });
    if (owner && !owner.roleId && adminRoleId) {
      await prisma.membership.update({
        where: { id: owner.id },
        data: { roleId: adminRoleId },
      });
    }

    console.log(`  ✓ ${org.name} (${org.id})`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
