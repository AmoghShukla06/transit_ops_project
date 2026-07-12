/**
 * App settings + RBAC matrix. Owner: Person A.
 * GET  -> general settings (depot, currency, distance unit) + the RBAC matrix for display.
 * PATCH -> persist general settings (Fleet Manager only) into the Setting key/value table.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { RBAC } from "@/lib/rbac";

const DEFAULT_SETTINGS: Record<string, string> = {
  depotName: "Gandhinagar Depot GJ4",
  currency: "INR",
  distanceUnit: "Kilometers",
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const rows = await prisma.setting.findMany();
  const general = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in general) general[row.key] = row.value;
  }

  return NextResponse.json({ general, rbac: RBAC, canEdit: session.role === "fleet_manager" });
}

const patchSchema = z.object({
  depotName: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  distanceUnit: z.string().min(1).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  if (session.role !== "fleet_manager") {
    return NextResponse.json({ detail: "Only a Fleet Manager can change settings" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });

  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      }),
    ),
  );

  const rows = await prisma.setting.findMany();
  const general = { ...DEFAULT_SETTINGS };
  for (const row of rows) if (row.key in general) general[row.key] = row.value;
  return NextResponse.json({ general });
}
