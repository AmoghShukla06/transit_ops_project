import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  verifyGoogleIdToken,
  signPendingGoogleProfile,
  GOOGLE_STATE_COOKIE,
  GOOGLE_PENDING_COOKIE,
} from "@/lib/google-auth";

/**
 * Google redirects back here after the user consents. Existing accounts (matched by
 * verified email) are logged straight in; first-time sign-ins are handed off to
 * /complete-profile to pick an RBAC role before their account is actually created.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const failUrl = new URL("/login", req.url);
  failUrl.searchParams.set("error", "google_failed");

  const store = await cookies();
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  store.delete(GOOGLE_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(failUrl);
  }

  try {
    const { id_token } = await exchangeCodeForTokens(code);
    const profile = await verifyGoogleIdToken(id_token);

    if (!profile.emailVerified) {
      const unverifiedUrl = new URL("/login", req.url);
      unverifiedUrl.searchParams.set("error", "google_email_unverified");
      return NextResponse.redirect(unverifiedUrl);
    }

    const existing = await prisma.user.findUnique({ where: { email: profile.email } });

    if (existing) {
      // Link the Google identity to an existing (e.g. password-created) account on
      // first Google sign-in, so either method works for it going forward.
      if (!existing.googleId || !existing.avatarUrl) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: existing.googleId ?? profile.googleId,
            avatarUrl: existing.avatarUrl ?? profile.picture,
          },
        });
      }

      // Google-verified sign-in bypasses password-lockout entirely — that mechanism
      // only guards the password-guessing path in /api/auth/login.
      await setSession(
        {
          sub: String(existing.id),
          role: existing.role,
          email: existing.email,
          name: existing.name,
          picture: existing.avatarUrl ?? profile.picture,
        },
        true,
      );
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // New account: stash the verified profile in a short-lived cookie and let the
    // user pick a role before we actually create anything.
    const pendingToken = await signPendingGoogleProfile(profile);
    store.set(GOOGLE_PENDING_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return NextResponse.redirect(new URL("/complete-profile", req.url));
  } catch {
    return NextResponse.redirect(failUrl);
  }
}
