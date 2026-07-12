import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, setSession } from "@/lib/auth";
import { ROLE_VALUES } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: Number(session.sub) },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ detail: "User not found" }, { status: 401 });
  return NextResponse.json(user);
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLE_VALUES).optional(),
});

/** Lets a signed-in user update their own display name and/or RBAC role from /profile. */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ detail: "Invalid input" }, { status: 400 });
  if (!parsed.data.name && !parsed.data.role) {
    return NextResponse.json({ detail: "Nothing to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: Number(session.sub) },
    data: parsed.data,
  });

  // name/role are baked into the session JWT (so the header renders with zero DB
  // queries) — re-issue it now, or the change wouldn't show up until next login.
  await setSession(
    { sub: String(user.id), role: user.role, email: user.email, name: user.name, picture: user.avatarUrl ?? undefined },
    true,
  );

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl });
}
