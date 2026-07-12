/**
 * Seed script — run with `npm run db:seed`.
 * Creates the 4 RBAC roles, multiple users, vehicles, drivers, and trips.
 *
 * Demo password for every user: "password123"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst"] as const;
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [
    { name: "Fiona Manager", email: "fleet@transitops.in", role: "fleet_manager" as const },
    { name: "Raven K.", email: "dispatcher@transitops.in", role: "dispatcher" as const },
    { name: "Sam Safety", email: "safety@transitops.in", role: "safety_officer" as const },
    { name: "Fin Analyst", email: "finance@transitops.in", role: "financial_analyst" as const },
    { name: "Admin Setup", email: "admin@transitops.in", role: "fleet_manager" as const },
    { name: "John Dispatch", email: "john@transitops.in", role: "dispatcher" as const },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  const vehiclesData = [
    { regNo: "GJ01AB4521", nameModel: "VAN-05", type: "Van", maxCapacityKg: 500, odometer: 74000, acquisitionCost: 620000, status: "available", region: "Gandhinagar" },
    { regNo: "MH02CD1234", nameModel: "TRUCK-01", type: "Truck", maxCapacityKg: 2000, odometer: 120000, acquisitionCost: 1500000, status: "in_shop", region: "Mumbai" },
    { regNo: "DL03EF5678", nameModel: "BIKE-02", type: "Motorcycle", maxCapacityKg: 50, odometer: 15000, acquisitionCost: 80000, status: "available", region: "Delhi" },
    { regNo: "KA04GH9012", nameModel: "VAN-08", type: "Van", maxCapacityKg: 600, odometer: 45000, acquisitionCost: 700000, status: "on_trip", region: "Bangalore" },
    { regNo: "TN05IJ3456", nameModel: "TRUCK-05", type: "Truck", maxCapacityKg: 5000, odometer: 80000, acquisitionCost: 2000000, status: "available", region: "Chennai" },
  ];

  const createdVehicles = [];
  for (const v of vehiclesData) {
    const dbVehicle = await prisma.vehicle.upsert({
      where: { regNo: v.regNo },
      update: v as any,
      create: v as any,
    });
    createdVehicles.push(dbVehicle);
  }

  const driversData = [
    { name: "Alex", licenseNo: "DL-88213", licenseCategory: "LMV", licenseExpiry: new Date("2028-12-31"), contact: "9876543210", safetyScore: 96, status: "available" },
    { name: "Rajesh", licenseNo: "DL-12345", licenseCategory: "HMV", licenseExpiry: new Date("2025-05-15"), contact: "9123456780", safetyScore: 85, status: "off_duty" },
    { name: "Vikram", licenseNo: "DL-98765", licenseCategory: "LMV", licenseExpiry: new Date("2026-08-20"), contact: "9988776655", safetyScore: 72, status: "on_trip" },
    { name: "Sunil", licenseNo: "DL-55555", licenseCategory: "MCWG", licenseExpiry: new Date("2027-01-10"), contact: "9000011111", safetyScore: 99, status: "available" },
    { name: "Amit", licenseNo: "DL-44444", licenseCategory: "HMV", licenseExpiry: new Date("2024-11-30"), contact: "8888899999", safetyScore: 60, status: "suspended" },
  ];

  const createdDrivers = [];
  for (const d of driversData) {
    const dbDriver = await prisma.driver.upsert({
      where: { licenseNo: d.licenseNo },
      update: d as any,
      create: d as any,
    });
    createdDrivers.push(dbDriver);
  }

  // Clear existing trips so we don't duplicate on re-runs
  await prisma.trip.deleteMany({});

  // Create Trips
  const tripsData = [
    { 
      code: "TR001", source: "Mumbai Warehouse", destination: "Pune Distribution", plannedDistance: 150, 
      status: "completed", finalOdometer: 120150, fuelConsumed: 12, revenue: 5000,
      cargoWeightKg: 1500, driverId: createdDrivers[1].id, vehicleId: createdVehicles[1].id 
    },
    { 
      code: "TR002", source: "Delhi Hub", destination: "Gurgaon", plannedDistance: 40, 
      status: "dispatched", finalOdometer: null, fuelConsumed: null, revenue: 1200,
      cargoWeightKg: 200, driverId: createdDrivers[2].id, vehicleId: createdVehicles[3].id 
    },
    { 
      code: "TR003", source: "Bangalore Center", destination: "Mysore", plannedDistance: 140, 
      status: "draft", finalOdometer: null, fuelConsumed: null, revenue: 4000,
      cargoWeightKg: 400, driverId: createdDrivers[0].id, vehicleId: createdVehicles[0].id 
    },
    { 
      code: "TR004", source: "Chennai Port", destination: "Industrial Park", plannedDistance: 60, 
      status: "dispatched", finalOdometer: null, fuelConsumed: null, revenue: 8000,
      cargoWeightKg: 4500, driverId: createdDrivers[4].id, vehicleId: createdVehicles[4].id 
    },
    { 
      code: "TR005", source: "Gandhinagar", destination: "Ahmedabad", plannedDistance: 30, 
      status: "cancelled", finalOdometer: null, fuelConsumed: null, revenue: 0,
      cargoWeightKg: 50, driverId: createdDrivers[3].id, vehicleId: createdVehicles[2].id 
    },
  ];

  for (const t of tripsData) {
    await prisma.trip.create({ data: t as any });
  }

  console.log("Seed complete. Added 6 Users, 5 Vehicles, 5 Drivers, and 5 Trips!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
