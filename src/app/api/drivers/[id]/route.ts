/**
 * Driver detail + status toggle. Owner: Person C.
 * PATCH handles both profile edits and status changes (available/on_trip/off_duty/suspended).
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  await params;
  // TODO(Person C): update driver fields / status.
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAccess("drivers", "edit");
  if (guard instanceof NextResponse) return guard;
  await params;
  // TODO(Person C): delete driver.
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
