/**
 * Trip business rules + status transitions (PDF §4). All mutations run in a
 * transaction so vehicle/driver status can never drift out of sync with the trip.
 *
 * Owner: Person C. Import these from the /api/trips route handlers.
 */
import { prisma } from "@/lib/prisma";
import { RuleError } from "@/server/services/errors";

export { RuleError };

/** Vehicles selectable for dispatch: never retired/in_shop/on_trip. */
export function dispatchableVehicles() {
  return prisma.vehicle.findMany({ where: { status: "available" } });
}

/** Drivers selectable for dispatch: available + license not expired. */
export function dispatchableDrivers() {
  return prisma.driver.findMany({
    where: { status: "available", licenseExpiry: { gte: new Date() } },
  });
}

/**
 * Dispatch a Draft trip.
 * Rules enforced: vehicle available & not in_shop/retired/on_trip; driver available,
 * not suspended, license not expired, not on_trip; cargo <= capacity.
 * Effect: vehicle + driver -> on_trip; trip -> dispatched.
 */
export async function dispatchTrip(tripId: number) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new RuleError("Trip not found");
    if (trip.status !== "draft") throw new RuleError("Only draft trips can be dispatched");
    if (!trip.vehicleId || !trip.driverId) throw new RuleError("Assign a vehicle and driver first");

    const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
    const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });
    if (!vehicle || !driver) throw new RuleError("Vehicle or driver missing");

    if (vehicle.status !== "available")
      throw new RuleError(`Vehicle is ${vehicle.status}, not available`);
    if (driver.status === "suspended") throw new RuleError("Driver is suspended");
    if (driver.status !== "available") throw new RuleError(`Driver is ${driver.status}`);
    if (driver.licenseExpiry < new Date()) throw new RuleError("Driver license has expired");
    if (trip.cargoWeightKg > vehicle.maxCapacityKg)
      throw new RuleError(
        `Capacity exceeded by ${trip.cargoWeightKg - vehicle.maxCapacityKg} kg — dispatch blocked`,
      );

    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "on_trip" } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: "on_trip" } });
    return tx.trip.update({ where: { id: tripId }, data: { status: "dispatched" } });
  });
}

/**
 * Complete a dispatched trip. Caller passes final odometer + fuel consumed.
 * Effect: vehicle odometer updated; vehicle + driver -> available; trip -> completed;
 * a fuel log is created so analytics/operational-cost update (PDF §5 step 6-9).
 */
export async function completeTrip(
  tripId: number,
  input: { finalOdometer: number; fuelConsumed: number; fuelCost?: number; revenue?: number },
) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new RuleError("Trip not found");
    if (trip.status !== "dispatched") throw new RuleError("Only dispatched trips can be completed");

    if (trip.vehicleId) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "available", odometer: input.finalOdometer },
      });
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          liters: input.fuelConsumed,
          cost: input.fuelCost ?? 0,
        },
      });
    }
    if (trip.driverId) {
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "available" } });
    }
    return tx.trip.update({
      where: { id: tripId },
      data: {
        status: "completed",
        finalOdometer: input.finalOdometer,
        fuelConsumed: input.fuelConsumed,
        revenue: input.revenue ?? 0,
      },
    });
  });
}

/** Cancel a dispatched trip -> restore vehicle + driver to available. */
export async function cancelTrip(tripId: number) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new RuleError("Trip not found");
    if (trip.status === "completed") throw new RuleError("Completed trips cannot be cancelled");

    if (trip.status === "dispatched") {
      if (trip.vehicleId)
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "available" } });
      if (trip.driverId)
        await tx.driver.update({ where: { id: trip.driverId }, data: { status: "available" } });
    }
    return tx.trip.update({ where: { id: tripId }, data: { status: "cancelled" } });
  });
}
