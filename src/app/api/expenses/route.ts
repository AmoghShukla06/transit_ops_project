/**
 * Expenses (tolls / misc, optionally linked to a trip or vehicle). Owner: Person D.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("fuel", "view");
  if (guard instanceof NextResponse) return guard;
  const expenses = await prisma.expense.findMany({
    include: {
      trip: { select: { id: true, code: true } },
      vehicle: { select: { id: true, regNo: true, nameModel: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(expenses);
}

const createSchema = z.object({
  toll: z.number().min(0).default(0),
  other: z.number().min(0).default(0),
  tripId: z.number().int().positive().optional(),
  vehicleId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAccess("fuel", "edit");
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ detail: "Invalid input", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  // FK integrity: verify trip exists if provided
  if (parsed.data.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } });
    if (!trip)
      return NextResponse.json({ detail: "Trip not found" }, { status: 404 });
  }

  // FK integrity: verify vehicle exists if provided
  if (parsed.data.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId } });
    if (!vehicle)
      return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });
  }

  const expense = await prisma.expense.create({
    data: {
      toll: parsed.data.toll,
      other: parsed.data.other,
      tripId: parsed.data.tripId ?? null,
      vehicleId: parsed.data.vehicleId ?? null,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
