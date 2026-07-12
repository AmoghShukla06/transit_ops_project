/**
 * Dashboard KPIs. Owner: Person C. GET /api/dashboard
 * Return: activeVehicles, availableVehicles, vehiclesInMaintenance, activeTrips,
 * pendingTrips, driversOnDuty, fleetUtilization (%). Support ?type= &status= &region= filters.
 */
import { NextResponse } from "next/server";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";

export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status") as VehicleStatus | null;
  const region = url.searchParams.get("region");

  const vehicleWhere: Prisma.VehicleWhereInput = {};
  if (type) vehicleWhere.type = type;
  if (region) vehicleWhere.region = region;
  if (status) vehicleWhere.status = status;

  const vehicleBase: Prisma.VehicleWhereInput = { ...vehicleWhere };
  delete vehicleBase.status; // status is handled by specific counters, unless filtered

  // When a status filter is active, buckets that don't match it should read 0
  // rather than querying Prisma with an out-of-enum sentinel value.
  const countByStatus = (specific: VehicleStatus) =>
    status && status !== specific
      ? Promise.resolve(0)
      : prisma.vehicle.count({ where: { ...vehicleBase, status: specific } });

  const [available, inShop, onTrip, activeTrips, pendingTrips, driversOnDuty, total] =
    await Promise.all([
      countByStatus("available"),
      countByStatus("in_shop"),
      countByStatus("on_trip"),
      prisma.trip.count({ where: { status: "dispatched", vehicle: region ? { region } : undefined } }),
      prisma.trip.count({ where: { status: "draft", vehicle: region ? { region } : undefined } }),
      prisma.driver.count({ where: { status: "on_trip" } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, NOT: { status: "retired" } } }),
    ]);

  return NextResponse.json({
    activeVehicles: onTrip,
    availableVehicles: available,
    vehiclesInMaintenance: inShop,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilization: total ? Math.round((onTrip / total) * 100) : 0,
  });
}
