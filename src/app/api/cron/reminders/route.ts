/**
 * License-expiry email reminders (bonus). Owner: Person D.
 * Trigger daily via an external scheduler (cron / GitHub Action / Vercel Cron) that calls
 * this route with header `Authorization: Bearer <CRON_SECRET>`. Sends mail via nodemailer.
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  // TODO(Person D): find drivers whose licenseExpiry is within N days, email each.
  return NextResponse.json({ detail: "Not implemented" }, { status: 501 });
}
