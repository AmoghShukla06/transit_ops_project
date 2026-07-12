/**
 * Drivers collection. Owner: Person C. Follow the pattern in ../vehicles/route.ts.
 * Remember: license expiry + suspended status gate trip assignment (enforced in trip service).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("drivers", "view");
  if (guard instanceof NextResponse) return guard;
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(drivers);
}

import { z } from "zod";

const createDriverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  licenseNo: z.string().min(1, "License number is required"),
  licenseCategory: z.string().min(1, "License category is required"),
  licenseExpiry: z.string().transform((str) => new Date(str)),
  contact: z.string().optional(),
  safetyScore: z.number().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  
  try {
    const body = await req.json();
    const data = createDriverSchema.parse(body);

    const existing = await prisma.driver.findUnique({ where: { licenseNo: data.licenseNo } });
    if (existing) {
      return NextResponse.json({ detail: "License number already exists" }, { status: 400 });
    }

    const driver = await prisma.driver.create({
      data,
    });
    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ detail: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ detail: "Failed to create driver" }, { status: 500 });
  }
}
