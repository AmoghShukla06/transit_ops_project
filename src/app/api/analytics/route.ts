/**
 * Analytics summary. Owner: Person D. GET /api/analytics
 * Return: fuelEfficiency, fleetUtilization, operationalCost, vehicleRoi,
 * monthlyRevenue[], topCostliestVehicles[]. Use src/server/services/cost.ts.
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAccess("analytics", "view");
  if (guard instanceof NextResponse) return guard;
  // TODO(Person D): compute metrics via cost service and return.
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
