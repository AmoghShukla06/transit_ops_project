/**
 * Vehicles collection — reference implementation for the CRUD pattern (Owner: Person B).
 * Copy this shape for drivers/trips/etc. Note the requireAccess() RBAC guard.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET(req: Request) {
  const guard = await requireAccess("fleet", "view");
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      type: type || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (status as any) || undefined,
      regNo: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    orderBy: { regNo: "asc" },
  });
  return NextResponse.json(vehicles);
}

const createSchema = z.object({
  regNo: z.string().min(1),
  nameModel: z.string().min(1),
  type: z.string().min(1),
  maxCapacityKg: z.number().positive(),
  odometer: z.number().min(0).default(0),
  acquisitionCost: z.number().min(0).default(0),
  region: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });

  // registration number must be unique
  const exists = await prisma.vehicle.findUnique({ where: { regNo: parsed.data.regNo } });
  if (exists) return NextResponse.json({ detail: "Registration number already exists" }, { status: 409 });

  const vehicle = await prisma.vehicle.create({ data: parsed.data });
  return NextResponse.json(vehicle, { status: 201 });
}
