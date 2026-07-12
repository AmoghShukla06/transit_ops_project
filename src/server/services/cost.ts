/**
 * Cost + analytics calculations (PDF §3.7, §3.8). Owner: Person D.
 *
 *   Operational cost per vehicle = Fuel + Maintenance
 *   Fuel Efficiency               = Distance / Fuel
 *   Vehicle ROI                   = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
 *   Fleet Utilization %           = vehicles on_trip / total (non-retired) * 100
 */
import { prisma } from "@/lib/prisma";

export async function operationalCostByVehicle(vehicleId: number) {
  const [fuel, maint] = await Promise.all([
    prisma.fuelLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
  ]);
  const fuelCost = fuel._sum.cost ?? 0;
  const maintCost = maint._sum.cost ?? 0;
  return { fuelCost, maintCost, total: fuelCost + maintCost };
}

// TODO(Person D): fleetUtilization(), fuelEfficiency(), vehicleRoi(),
// topCostliestVehicles(), monthlyRevenue() — feed the /api/analytics/summary route.
