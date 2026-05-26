


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
