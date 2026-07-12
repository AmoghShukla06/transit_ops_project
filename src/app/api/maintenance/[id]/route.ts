/**
 * Close a maintenance record (PDF §3.6, §4): restores the vehicle to Available
 * (unless retired) — see src/server/services/maintenance.ts.
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import { closeMaintenance, RuleError } from "@/server/services/maintenance";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAccess("fleet", "edit");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action !== "close") {
    return NextResponse.json({ detail: "Unknown action" }, { status: 400 });
  }

  try {
    const log = await closeMaintenance(Number(id));
    return NextResponse.json(log);
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ detail: e.message }, { status: e.status });
    throw e;
  }
}
