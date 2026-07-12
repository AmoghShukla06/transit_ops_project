import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });
  const { email, password, rememberMe } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });

  // Account lockout (mockup: locked after 5 failed attempts).
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ detail: "Account locked. Try again later." }, { status: 423 });
  }

  // Google-only accounts have no password to check against.
  if (!user.passwordHash) {
    return NextResponse.json(
      { detail: "This account uses Google Sign-In. Use the Google button below to log in." },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: attempts,
        lockedUntil:
          attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }

  // Reset counters on success — but only touch the DB if there's actually something to clear,
  // so the common (clean) login path is a single query instead of two.
  if (user.failedAttempts !== 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  await setSession(
    { sub: String(user.id), role: user.role, email: user.email, name: user.name, picture: user.avatarUrl ?? undefined },
    rememberMe,
  );
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
