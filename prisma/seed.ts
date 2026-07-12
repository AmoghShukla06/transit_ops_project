/**
 * Seed script — run with `npm run db:seed`.
 * Creates the 4 RBAC roles, one demo user per role, and a few vehicles/drivers
 * from the mockup so the app is demoable immediately.
 *
 * Demo password for every user: "password123"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst"] as const;
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [
    { name: "Fiona Manager", email: "fleet@transitops.in", role: "fleet_manager" as const },
    { name: "Raven K.", email: "dispatcher@transitops.in", role: "dispatcher" as const },
    { name: "Sam Safety", email: "safety@transitops.in", role: "safety_officer" as const },
    { name: "Fin Analyst", email: "finance@transitops.in", role: "financial_analyst" as const },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  await prisma.vehicle.upsert({
    where: { regNo: "GJ01AB4521" },
    update: {},
    create: {
      regNo: "GJ01AB4521",
      nameModel: "VAN-05",
      type: "Van",
      maxCapacityKg: 500,
      odometer: 74000,
      acquisitionCost: 620000,
      status: "available",
      region: "Gandhinagar",
    },
  });

  await prisma.driver.upsert({
    where: { licenseNo: "DL-88213" },
    update: {},
    create: {
      name: "Alex",
      licenseNo: "DL-88213",
      licenseCategory: "LMV",
      licenseExpiry: new Date("2028-12-31"),
      contact: "98765xxxxx",
      safetyScore: 96,
      status: "available",
    },
  });

  console.log("Seed complete. Login with any demo email + password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
