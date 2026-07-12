/**
 * Dashboard KPIs. Owner: Person C. GET /api/dashboard
 * Return: activeVehicles, availableVehicles, vehiclesInMaintenance, activeTrips,
 * pendingTrips, driversOnDuty, fleetUtilization (%). Support ?type= &status= &region= filters.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";

export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status") as any;
  const region = url.searchParams.get("region");

  const vehicleWhere: any = {};
  if (type) vehicleWhere.type = type;
  if (region) vehicleWhere.region = region;
  if (status) vehicleWhere.status = status;

  const vehicleBase: any = { ...vehicleWhere };
  delete vehicleBase.status; // status is handled by specific counters, unless filtered

  const [available, inShop, onTrip, activeTrips, pendingTrips, driversOnDuty, total] =
    await Promise.all([
      prisma.vehicle.count({ where: { ...vehicleBase, status: status === "available" ? "available" : status ? "none" : "available" } }),
      prisma.vehicle.count({ where: { ...vehicleBase, status: status === "in_shop" ? "in_shop" : status ? "none" : "in_shop" } }),
      prisma.vehicle.count({ where: { ...vehicleBase, status: status === "on_trip" ? "on_trip" : status ? "none" : "on_trip" } }),
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
