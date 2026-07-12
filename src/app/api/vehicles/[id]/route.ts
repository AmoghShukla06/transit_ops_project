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

const patchSchema = z.object({
  regNo: z.string().min(1).optional(),
  nameModel: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  maxCapacityKg: z.number().positive().optional(),
  odometer: z.number().min(0).optional(),
  acquisitionCost: z.number().min(0).optional(),
  status: z.enum(["available", "on_trip", "in_shop", "retired"]).optional(),
  region: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const vehicleId = Number(id);

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });

  // guard reg-no uniqueness on change (only checks if regNo is actually being updated)
  if (parsed.data.regNo) {
    const existing = await prisma.vehicle.findUnique({ where: { regNo: parsed.data.regNo } });
    if (existing && existing.id !== vehicleId) {
      return NextResponse.json({ detail: "Registration number already exists" }, { status: 409 });
    }
  }

  const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: parsed.data });
  return NextResponse.json(vehicle);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  await prisma.vehicle.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
