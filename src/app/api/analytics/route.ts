/**
 * Analytics summary. Owner: Person D. GET /api/analytics
 * Return: fuelEfficiency, fleetUtilization, operationalCost, vehicleRoi,
 * monthlyRevenue[], topCostliestVehicles[]. Use src/server/services/cost.ts.
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import {
  fleetUtilization,
  fuelEfficiency,
  topCostliestVehicles,
  monthlyRevenue,
  totalOperationalCost,
} from "@/server/services/cost";

export async function GET() {
  const guard = await requireAccess("analytics", "view");
  if (guard instanceof NextResponse) return guard;

  const [utilization, efficiency, costliest, revenue, opCost] = await Promise.all([
    fleetUtilization(),
    fuelEfficiency(),
    topCostliestVehicles(5),
    monthlyRevenue(6),
    totalOperationalCost(),
  ]);

  return NextResponse.json({
    fleetUtilization: utilization,
    fuelEfficiency: efficiency.overall,
    fuelEfficiencyPerVehicle: efficiency.perVehicle,
    operationalCost: opCost,
    monthlyRevenue: revenue,
    topCostliestVehicles: costliest,
  });
}
