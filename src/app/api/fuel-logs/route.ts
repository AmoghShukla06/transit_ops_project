/**
 * Fuel logs. Owner: Person D. Fields: vehicleId, liters, cost, date.
 * Feeds operational-cost + fuel-efficiency analytics.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
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

const createSchema = z.object({
  vehicleId: z.number().int().positive(),
  liters: z.number().positive(),
  cost: z.number().min(0),
  date: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAccess("fuel", "edit");
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ detail: "Invalid input", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  // Verify vehicle exists
  const vehicle = await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId } });
  if (!vehicle)
    return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });

  const log = await prisma.fuelLog.create({
    data: {
      vehicleId: parsed.data.vehicleId,
      liters: parsed.data.liters,
      cost: parsed.data.cost,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    },
  });
  return NextResponse.json(log, { status: 201 });
}
