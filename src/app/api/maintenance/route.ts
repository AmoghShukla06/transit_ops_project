/**
 * Maintenance records. Owner: Person B. Creating one flips the vehicle to in_shop.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";
import { createMaintenance, RuleError } from "@/server/services/maintenance";

export async function GET() {
  const guard = await requireAccess("fleet", "view");
  if (guard instanceof NextResponse) return guard;
  const logs = await prisma.maintenanceLog.findMany({
    include: { vehicle: { select: { regNo: true, nameModel: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(logs);
}

const schema = z.object({
  vehicleId: z.number().int(),
  serviceType: z.string().min(1),
  cost: z.number().min(0),
  date: z.coerce.date().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });
  try {
    const log = await createMaintenance(parsed.data);
    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ detail: e.message }, { status: e.status });
    throw e;
  }
}
