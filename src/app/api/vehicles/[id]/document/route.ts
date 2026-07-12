import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const vehicleId = Number(id);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ detail: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ detail: "File too large (max 10MB)" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const safeName = `vehicle-${vehicleId}-${Date.now()}${ext}`;
  const filePath = path.join(uploadsDir, safeName);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  const documentPath = `/uploads/${safeName}`;
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { documentPath },
  });

  return NextResponse.json(updated, { status: 201 });
}