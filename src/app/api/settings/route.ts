/**
 * App settings + RBAC matrix. Owner: Person A.
 * GET returns general settings (depot, currency, distance unit) + the RBAC matrix for display.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { RBAC } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({
    general: { depotName: "Gandhinagar Depot GJ4", currency: "INR", distanceUnit: "Kilometers" },
    rbac: RBAC,
  });
}

export async function PATCH() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  // TODO(Person A): persist general settings (add a Settings model or a key/value table).
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
