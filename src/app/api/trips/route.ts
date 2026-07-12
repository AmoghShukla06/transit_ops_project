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

import { z } from "zod";

const createTripSchema = z.object({
  source: z.string().min(1, "Source is required"),
  destination: z.string().min(1, "Destination is required"),
  vehicleId: z.number().nullable().optional(),
  driverId: z.number().nullable().optional(),
  cargoWeightKg: z.number().min(0, "Cargo weight must be positive"),
  plannedDistance: z.number().min(0, "Planned distance must be positive"),
});

export async function POST(req: Request) {
  const guard = await requireAccess("trips", "edit");
  if (guard instanceof NextResponse) return guard;
  
  try {
    const body = await req.json();
    const data = createTripSchema.parse(body);

    const lastTrip = await prisma.trip.findFirst({ orderBy: { id: "desc" } });
    const nextId = lastTrip ? lastTrip.id + 1 : 1;
    const code = `TR${String(nextId).padStart(3, "0")}`;

    const trip = await prisma.trip.create({
      data: {
        code,
        source: data.source,
        destination: data.destination,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        cargoWeightKg: data.cargoWeightKg,
        plannedDistance: data.plannedDistance,
        status: "draft",
      },
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ detail: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ detail: "Failed to create trip" }, { status: 500 });
  }
}
