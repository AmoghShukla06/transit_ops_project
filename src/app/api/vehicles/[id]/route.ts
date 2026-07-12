import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "view");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(id) } });
  if (!vehicle) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

const updateSchema = z.object({
  regNo: z.string().min(1).optional(),
  nameModel: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  maxCapacityKg: z.number().positive().optional(),
  odometer: z.number().min(0).optional(),
  acquisitionCost: z.number().min(0).optional(),
  region: z.string().optional(),
  status: z.enum(["available", "on_trip", "in_shop", "retired"]).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const vehicleId = Number(id);

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });

  // Registration number must stay unique across the fleet.
  if (parsed.data.regNo) {
    const existing = await prisma.vehicle.findFirst({
      where: { regNo: parsed.data.regNo, id: { not: vehicleId } },
    });
    if (existing) {
      return NextResponse.json({ detail: "Registration number already exists" }, { status: 409 });
    }
  }

  try {
    const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: parsed.data });
    return NextResponse.json(vehicle);
  } catch {
    return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  try {
    await prisma.vehicle.delete({ where: { id: Number(id) } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });
  }
}
