/**
 * Dashboard KPIs. Owner: Person C. GET /api/dashboard
 * Return: activeVehicles, availableVehicles, vehiclesInMaintenance, activeTrips,
 * pendingTrips, driversOnDuty, fleetUtilization (%). Support ?type= &status= &region= filters.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";

export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  // Minimal working example — extend with filters + all KPIs.
  const [available, inShop, onTrip, activeTrips, pendingTrips, driversOnDuty, total] =
    await Promise.all([
      prisma.vehicle.count({ where: { status: "available" } }),
      prisma.vehicle.count({ where: { status: "in_shop" } }),
      prisma.vehicle.count({ where: { status: "on_trip" } }),
      prisma.trip.count({ where: { status: "dispatched" } }),
      prisma.trip.count({ where: { status: "draft" } }),
      prisma.driver.count({ where: { status: "on_trip" } }),
      prisma.vehicle.count({ where: { NOT: { status: "retired" } } }),
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
