/**
 * Role-Based Access Control.
 *
 * Matrix mirrors the Settings screen. `edit` implies read+write, `view` is read-only,
 * `false` means no access. The API routes are the real gate — the UI just hides things.
 */
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

export type Module = "fleet" | "drivers" | "trips" | "fuel" | "analytics";
export type Access = "edit" | "view" | false;

export const RBAC: Record<UserRole, Record<Module, Access>> = {
  fleet_manager: { fleet: "edit", drivers: "edit", trips: false, fuel: false, analytics: "view" },
  dispatcher: { fleet: "view", drivers: false, trips: "edit", fuel: false, analytics: false },
  safety_officer: { fleet: false, drivers: "edit", trips: "view", fuel: false, analytics: false },
  financial_analyst: { fleet: "view", drivers: false, trips: false, fuel: "edit", analytics: "view" },
};

export function can(role: UserRole, module: Module, need: "view" | "edit"): boolean {
  const access = RBAC[role][module];
  if (access === false) return false;
  if (need === "view") return true; // both "view" and "edit" grant read
  return access === "edit";
}

/**
 * Guard for Route Handlers. Returns the session on success, or a NextResponse to return early.
 *
 *   const s = await requireAccess("trips", "edit");
 *   if (s instanceof NextResponse) return s;
 *   // ...use s.sub / s.role
 */
export async function requireAccess(
  module: Module,
  need: "view" | "edit",
): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  if (!can(session.role, module, need))
    return NextResponse.json({ detail: "Insufficient permissions" }, { status: 403 });
  return session;
}

/** Auth-only guard (no module check). */
export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  return session;
}
