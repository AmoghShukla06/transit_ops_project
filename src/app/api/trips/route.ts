/**
 * Trips collection. Owner: Person C.
 * GET -> list (with vehicle/driver joins for the live board).
 * POST -> create a DRAFT trip (source, destination, vehicleId?, driverId?, cargoWeightKg,
 *         plannedDistance). Dispatch happens later via POST /api/trips/{id} { action: "dispatch" }.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("trips", "view");
  if (guard instanceof NextResponse) return guard;
  const trips = await prisma.trip.findMany({
    include: { vehicle: true, driver: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST() {
  const guard = await requireAccess("trips", "edit");
  if (guard instanceof NextResponse) return guard;
  // TODO(Person C): zod-validate + create draft trip. Auto-generate `code` (TR001...).
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
