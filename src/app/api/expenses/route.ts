/**
 * Expenses (tolls / misc, optionally linked to a trip or vehicle). Owner: Person D.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("fuel", "view");
  if (guard instanceof NextResponse) return guard;
  const expenses = await prisma.expense.findMany({
    include: { trip: true, vehicle: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST() {
  const guard = await requireAccess("fuel", "edit");
  if (guard instanceof NextResponse) return guard;
  // TODO(Person D): zod-validate + create expense (toll, other, tripId?, vehicleId?).
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
