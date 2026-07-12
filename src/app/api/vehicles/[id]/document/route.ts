/**
 * Vehicle document management (bonus, PDF §8). Accepts a multipart file upload
 * (RC book, insurance, permit, ...) and stores it under public/uploads/vehicles,
 * recording the path on Vehicle.documentPath.
 */
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const vehicleId = Number(id);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ detail: "File exceeds 5MB limit" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ detail: "Only PDF, PNG, JPEG, or WebP files are allowed" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "vehicles");
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filename = `${vehicleId}-${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  const documentPath = `/uploads/vehicles/${filename}`;
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { documentPath },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const updated = await prisma.vehicle.update({
    where: { id: Number(id) },
    data: { documentPath: null },
  });
  return NextResponse.json(updated);
}
