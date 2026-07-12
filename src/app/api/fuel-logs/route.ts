/**
 * Fuel logs. Owner: Person D. Fields: vehicleId, liters, cost, date.
 * Feeds operational-cost + fuel-efficiency analytics.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("fuel", "view");
  if (guard instanceof NextResponse) return guard;
  const logs = await prisma.fuelLog.findMany({
    include: { vehicle: { select: { regNo: true, nameModel: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST() {
  const guard = await requireAccess("fuel", "edit");
  if (guard instanceof NextResponse) return guard;
  // TODO(Person D): zod-validate + create fuel log.
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
