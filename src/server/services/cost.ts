/**
 * Cost + analytics calculations (PDF §3.7, §3.8). Owner: Person D.
 *
 *   Operational cost per vehicle = Fuel + Maintenance
 *   Fuel Efficiency               = Distance / Fuel
 *   Vehicle ROI                   = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
 *   Fleet Utilization %           = vehicles on_trip / total (non-retired) * 100
 */
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Operational cost per vehicle (already implemented)                 */
/* ------------------------------------------------------------------ */

export async function operationalCostByVehicle(vehicleId: number) {
  const [fuel, maint] = await Promise.all([
    prisma.fuelLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ where: { vehicleId }, _sum: { cost: true } }),
  ]);
  const fuelCost = fuel._sum.cost ?? 0;
  const maintCost = maint._sum.cost ?? 0;
  return { fuelCost, maintCost, total: fuelCost + maintCost };
}

/* ------------------------------------------------------------------ */
/*  Fleet Utilization %                                                */
/* ------------------------------------------------------------------ */

export async function fleetUtilization() {
  const [onTrip, total] = await Promise.all([
    prisma.vehicle.count({ where: { status: "on_trip" } }),
    prisma.vehicle.count({ where: { NOT: { status: "retired" } } }),
  ]);
  return total > 0 ? Math.round((onTrip / total) * 100) : 0;
}

/* ------------------------------------------------------------------ */
/*  Fuel Efficiency (overall + per vehicle)                            */
/* ------------------------------------------------------------------ */

export async function fuelEfficiency() {
  const completedTrips = await prisma.trip.aggregate({
    where: { status: "completed", fuelConsumed: { gt: 0 } },
    _sum: { plannedDistance: true, fuelConsumed: true },
  });

  const totalDistance = completedTrips._sum.plannedDistance ?? 0;
  const totalFuel = completedTrips._sum.fuelConsumed ?? 0;
  const overall = totalFuel > 0 ? Math.round((totalDistance / totalFuel) * 100) / 100 : 0;

  // Per-vehicle breakdown
  const vehicles = await prisma.vehicle.findMany({
    where: { NOT: { status: "retired" } },
    select: { id: true, regNo: true, nameModel: true },
  });

  const perVehicle = await Promise.all(
    vehicles.map(async (v) => {
      const agg = await prisma.trip.aggregate({
        where: { vehicleId: v.id, status: "completed", fuelConsumed: { gt: 0 } },
        _sum: { plannedDistance: true, fuelConsumed: true },
      });
      const dist = agg._sum.plannedDistance ?? 0;
      const fuel = agg._sum.fuelConsumed ?? 0;
      return {
        vehicleId: v.id,
        regNo: v.regNo,
        nameModel: v.nameModel,
        efficiency: fuel > 0 ? Math.round((dist / fuel) * 100) / 100 : 0,
      };
    }),
  );

  return { overall, perVehicle };
}

/* ------------------------------------------------------------------ */
/*  Vehicle ROI                                                        */
/* ------------------------------------------------------------------ */

export async function vehicleRoi(vehicleId: number) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.acquisitionCost === 0) return { roi: 0 };

  const revenue = await prisma.trip.aggregate({
    where: { vehicleId, status: "completed" },
    _sum: { revenue: true },
  });
  const totalRevenue = revenue._sum.revenue ?? 0;
  const cost = await operationalCostByVehicle(vehicleId);

  const roi = Math.round(((totalRevenue - cost.total) / vehicle.acquisitionCost) * 10000) / 100;
  return { roi, totalRevenue, operationalCost: cost.total, acquisitionCost: vehicle.acquisitionCost };
}

/* ------------------------------------------------------------------ */
/*  Top costliest vehicles                                             */
/* ------------------------------------------------------------------ */

export async function topCostliestVehicles(limit = 5) {
  const vehicles = await prisma.vehicle.findMany({
    where: { NOT: { status: "retired" } },
    select: { id: true, regNo: true, nameModel: true },
  });

  const withCosts = await Promise.all(
    vehicles.map(async (v) => {
      const cost = await operationalCostByVehicle(v.id);
      return { vehicleId: v.id, regNo: v.regNo, nameModel: v.nameModel, ...cost };
    }),
  );

  return withCosts.sort((a, b) => b.total - a.total).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Monthly Revenue (last N months) — uses raw SQL for date grouping   */
/* ------------------------------------------------------------------ */

interface MonthlyRow {
  month: number;
  year: number;
  revenue: number;
}

export async function monthlyRevenue(months = 6): Promise<MonthlyRow[]> {
  const rows = await prisma.$queryRaw<MonthlyRow[]>`
    SELECT
      EXTRACT(MONTH FROM "createdAt")::int AS month,
      EXTRACT(YEAR  FROM "createdAt")::int AS year,
      COALESCE(SUM("revenue"), 0)::float   AS revenue
    FROM "Trip"
    WHERE "status" = 'completed'
      AND "createdAt" >= NOW() - INTERVAL '${months} months'
    GROUP BY year, month
    ORDER BY year, month
  `;
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Aggregated total operational cost (all vehicles)                   */
/* ------------------------------------------------------------------ */

export async function totalOperationalCost() {
  const [fuel, maint] = await Promise.all([
    prisma.fuelLog.aggregate({ _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ _sum: { cost: true } }),
  ]);
  const fuelCost = fuel._sum.cost ?? 0;
  const maintCost = maint._sum.cost ?? 0;
  return { fuelCost, maintCost, total: fuelCost + maintCost };
}
