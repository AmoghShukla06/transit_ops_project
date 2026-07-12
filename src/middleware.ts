/**
 * Route protection at the edge: unauthenticated users hitting a protected page are
 * redirected to /login. Fine-grained per-module RBAC is enforced in the API routes
 * (see src/lib/rbac.ts) and reflected in the UI.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // Authenticated user visiting an auth page -> send to dashboard.
  if (isPublic && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated user visiting a protected page -> send to login.
  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// Protect everything except Next internals, the auth API, and static assets.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)).*)"],
};
