import { NextResponse } from "next/server";
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

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const data = await req.json();
  // TODO(Person B): validate with zod; guard regNo uniqueness on change.
  const vehicle = await prisma.vehicle.update({ where: { id: Number(id) }, data });
  return NextResponse.json(vehicle);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  await prisma.vehicle.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
