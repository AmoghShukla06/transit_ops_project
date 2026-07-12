/**
 * Maintenance workflow (PDF §3.6, §4). Owner: Person B.
 * - Creating an ACTIVE maintenance record -> vehicle status = in_shop (hidden from dispatch).
 * - Closing maintenance -> vehicle back to available (unless retired).
 */
import { prisma } from "@/lib/prisma";
import { RuleError } from "@/server/services/errors";

export { RuleError };

export async function createMaintenance(input: {
  vehicleId: number;
  serviceType: string;
  cost: number;
  date?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new RuleError("Vehicle not found");
    if (vehicle.status === "on_trip")
      throw new RuleError("Vehicle is on a trip; complete/cancel it before maintenance");

    const log = await tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        serviceType: input.serviceType,
        cost: input.cost,
        date: input.date ?? new Date(),
        status: "active",
      },
    });
    if (vehicle.status !== "retired") {
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "in_shop" } });
    }
    return log;
  });
}

export async function closeMaintenance(id: number) {
  return prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({ where: { id } });
    if (!log) throw new RuleError("Maintenance record not found");

    const updated = await tx.maintenanceLog.update({ where: { id }, data: { status: "closed" } });
    const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicleId } });
    if (vehicle && vehicle.status !== "retired") {
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "available" } });
    }
    return updated;
  });
}
