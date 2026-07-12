/**
 * Driver detail + status toggle. Owner: Person C.
 * PATCH handles both profile edits and status changes (available/on_trip/off_duty/suspended).
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateDriverSchema = z.object({
  name: z.string().optional(),
  licenseNo: z.string().optional(),
  licenseCategory: z.string().optional(),
  licenseExpiry: z.string().transform((str) => new Date(str)).optional(),
  contact: z.string().optional(),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(["available", "on_trip", "off_duty", "suspended"]).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const driverId = Number(id);

  try {
    const body = await req.json();
    const data = updateDriverSchema.parse(body);

    if (data.licenseNo) {
      const existing = await prisma.driver.findFirst({
        where: { licenseNo: data.licenseNo, id: { not: driverId } },
      });
      if (existing) {
        return NextResponse.json({ detail: "License number already exists" }, { status: 400 });
      }
    }

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data,
    });
    return NextResponse.json(driver);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ detail: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ detail: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const driverId = Number(id);

  try {
    await prisma.driver.delete({ where: { id: driverId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ detail: "Failed to delete driver" }, { status: 500 });
  }
}
