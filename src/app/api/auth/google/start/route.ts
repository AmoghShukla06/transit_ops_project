import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleAuthUrl, isGoogleConfigured, GOOGLE_STATE_COOKIE } from "@/lib/google-auth";

/** Kicks off "Continue with Google" — redirects the browser to Google's consent screen. */
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const state = crypto.randomUUID();
  const store = await cookies();
  store.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes — just long enough to complete the redirect round-trip
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
