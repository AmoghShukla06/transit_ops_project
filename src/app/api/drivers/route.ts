/**
 * Drivers collection. Owner: Person C. Follow the pattern in ../vehicles/route.ts.
 * Remember: license expiry + suspended status gate trip assignment (enforced in trip service).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("drivers", "view");
  if (guard instanceof NextResponse) return guard;
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(drivers);
}

export async function POST() {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  // TODO(Person C): zod-validate + create driver (name, licenseNo, licenseCategory,
  // licenseExpiry, contact, safetyScore).
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
