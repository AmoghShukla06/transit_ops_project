/**
 * Trip lifecycle actions. Owner: Person C.
 * POST body: { action: "dispatch" | "complete" | "cancel", finalOdometer?, fuelConsumed?, fuelCost? }
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import { dispatchTrip, completeTrip, cancelTrip, RuleError } from "@/server/services/trip";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireAccess("trips", "edit");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const tripId = Number(id);
  const body = await req.json();

  try {
    switch (body.action) {
      case "dispatch":
        return NextResponse.json(await dispatchTrip(tripId));
      case "complete":
        return NextResponse.json(
          await completeTrip(tripId, {
            finalOdometer: Number(body.finalOdometer),
            fuelConsumed: Number(body.fuelConsumed),
            fuelCost: body.fuelCost ? Number(body.fuelCost) : undefined,
          }),
        );
      case "cancel":
        return NextResponse.json(await cancelTrip(tripId));
      default:
        return NextResponse.json({ detail: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ detail: e.message }, { status: e.status });
    throw e;
  }
}
