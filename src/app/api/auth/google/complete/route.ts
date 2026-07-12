import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";
import { verifyPendingGoogleProfile, GOOGLE_PENDING_COOKIE } from "@/lib/google-auth";
import { ROLE_VALUES } from "@/lib/roles";

const schema = z.object({ role: z.enum(ROLE_VALUES) });

/** Finishes a first-time Google sign-in: creates the account with the chosen role. */
export async function POST(req: Request) {
  const store = await cookies();
  const pendingToken = store.get(GOOGLE_PENDING_COOKIE)?.value;
  if (!pendingToken) {
    return NextResponse.json(
      { detail: "Your Google sign-in session expired. Please try again." },
      { status: 400 },
    );
  }

  const profile = await verifyPendingGoogleProfile(pendingToken);
  if (!profile) {
    store.delete(GOOGLE_PENDING_COOKIE);
    return NextResponse.json(
      { detail: "Your Google sign-in session expired. Please try again." },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ detail: "Select a role to continue." }, { status: 400 });
  }

  // Idempotency: if the account already exists (e.g. the tab was left open and the
  // user completed sign-in elsewhere, or double-submitted), just log them in.
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        role: parsed.data.role,
        googleId: profile.googleId,
        avatarUrl: profile.picture,
        passwordHash: null,
      },
    }));

  store.delete(GOOGLE_PENDING_COOKIE);
  await setSession(
    { sub: String(user.id), role: user.role, email: user.email, name: user.name, picture: user.avatarUrl ?? undefined },
    true,
  );
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
