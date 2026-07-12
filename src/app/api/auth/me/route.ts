import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: Number(session.sub) },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ detail: "User not found" }, { status: 401 });
  return NextResponse.json(user);
}
