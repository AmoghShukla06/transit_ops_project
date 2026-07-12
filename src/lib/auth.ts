/**
 * Auth helpers: password hashing, JWT sign/verify, and httpOnly-cookie session.
 *
 * Decision: the JWT is stored in an httpOnly cookie (not localStorage) so client JS
 * can never read it — mitigating XSS token theft. `jose` is Edge-runtime compatible,
 * so the same verify() works in middleware.
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "transitops_token";
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

export type SessionPayload = {
  sub: string; // user id
  role: UserRole;
  email: string;
  name: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "1h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      email: payload.email as string,
      name: (payload.name as string) ?? (payload.email as string),
    };
  } catch {
    return null;
  }
}

/** Set the auth cookie (call from a Route Handler / Server Action). */
export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1h
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Read + verify the current session from the cookie. Returns null if unauthenticated. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
