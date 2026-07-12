/**
 * Cost + analytics calculations (PDF §3.7, §3.8). Owner: Person D.
 *
 *   Operational cost per vehicle = Fuel + Maintenance
 *   Fuel Efficiency               = Distance / Fuel
 *   Vehicle ROI                   = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
 *   Fleet Utilization %           = vehicles on_trip / total (non-retired) * 100
 */
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fuel + maintenance cost summed per vehicle, in exactly two grouped queries
 * (instead of two queries *per vehicle*). Returns maps keyed by vehicleId.
 */
async function costMapsByVehicle() {
  const [fuelByV, maintByV] = await Promise.all([
    prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
    prisma.maintenanceLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
  ]);
  const fuel = new Map(fuelByV.map((r) => [r.vehicleId, r._sum.cost ?? 0]));
  const maint = new Map(maintByV.map((r) => [r.vehicleId, r._sum.cost ?? 0]));
  return { fuel, maint };
}

/* ------------------------------------------------------------------ */
/*  Operational cost per vehicle                                       */
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
  const [overallAgg, perVehicleAgg, vehicles] = await Promise.all([
    prisma.trip.aggregate({
      where: { status: "completed", fuelConsumed: { gt: 0 } },
      _sum: { plannedDistance: true, fuelConsumed: true },
    }),
    prisma.trip.groupBy({
      by: ["vehicleId"],
      where: { status: "completed", fuelConsumed: { gt: 0 } },
      _sum: { plannedDistance: true, fuelConsumed: true },
    }),
    prisma.vehicle.findMany({
      where: { NOT: { status: "retired" } },
      select: { id: true, regNo: true, nameModel: true },
    }),
  ]);

  const totalDistance = overallAgg._sum.plannedDistance ?? 0;
  const totalFuel = overallAgg._sum.fuelConsumed ?? 0;
  const overall = totalFuel > 0 ? round2(totalDistance / totalFuel) : 0;

  const effByV = new Map(perVehicleAgg.map((r) => [r.vehicleId, r._sum]));
  const perVehicle = vehicles.map((v) => {
    const agg = effByV.get(v.id);
    const dist = agg?.plannedDistance ?? 0;
    const fuel = agg?.fuelConsumed ?? 0;
    return {
      vehicleId: v.id,
      regNo: v.regNo,
      nameModel: v.nameModel,
      efficiency: fuel > 0 ? round2(dist / fuel) : 0,
    };
  });

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
/*  Vehicle ROI — fleet-wide list (PDF 3.8 requires ROI on Reports)     */
/* ------------------------------------------------------------------ */

export async function vehicleRoiList() {
  const [vehicles, revByV, costs] = await Promise.all([
    prisma.vehicle.findMany({
      where: { NOT: { status: "retired" } },
      select: { id: true, regNo: true, nameModel: true, acquisitionCost: true },
    }),
    prisma.trip.groupBy({
      by: ["vehicleId"],
      where: { status: "completed" },
      _sum: { revenue: true },
    }),
    costMapsByVehicle(),
  ]);

  const revenueMap = new Map(revByV.map((r) => [r.vehicleId, r._sum.revenue ?? 0]));

  return vehicles.map((v) => {
    const revenue = revenueMap.get(v.id) ?? 0;
    const operationalCost = (costs.fuel.get(v.id) ?? 0) + (costs.maint.get(v.id) ?? 0);
    const roi =
      v.acquisitionCost > 0 ? round2(((revenue - operationalCost) / v.acquisitionCost) * 100) : 0;
    return {
      vehicleId: v.id,
      regNo: v.regNo,
      nameModel: v.nameModel,
      revenue,
      operationalCost,
      acquisitionCost: v.acquisitionCost,
      roi,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Top costliest vehicles                                             */
/* ------------------------------------------------------------------ */

export async function topCostliestVehicles(limit = 5) {
  const [vehicles, costs] = await Promise.all([
    prisma.vehicle.findMany({
      where: { NOT: { status: "retired" } },
      select: { id: true, regNo: true, nameModel: true },
    }),
    costMapsByVehicle(),
  ]);

  return vehicles
    .map((v) => {
      const fuelCost = costs.fuel.get(v.id) ?? 0;
      const maintCost = costs.maint.get(v.id) ?? 0;
      return {
        vehicleId: v.id,
        regNo: v.regNo,
        nameModel: v.nameModel,
        fuelCost,
        maintCost,
        total: fuelCost + maintCost,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
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
      AND "createdAt" >= NOW() - make_interval(months => ${months}::int)
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
