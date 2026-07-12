/**
 * Google Sign-In (OAuth 2.0 / OpenID Connect), implemented directly against this app's
 * own JWT/httpOnly-cookie session system — no NextAuth or other auth library, consistent
 * with the rest of src/lib/auth.ts.
 *
 * Flow: /api/auth/google/start redirects to Google -> user consents -> Google redirects
 * back to /api/auth/google/callback with a `code` -> we exchange it for an id_token and
 * verify it against Google's public keys -> existing users are logged in immediately;
 * first-time users are sent to /complete-profile to pick an RBAC role before their
 * account (and real session) is created.
 */
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_PENDING_COOKIE = "google_pending_profile";

export type GoogleProfile = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

/** Build the URL to send the browser to for the Google consent screen. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    scope: "openid email profile",
    state,
    // Lets a user with multiple Google accounts pick one, instead of silently
    // reusing whichever session Google already has active in the browser.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/** Exchange the one-time authorization code for tokens (server-to-server call). */
export async function exchangeCodeForTokens(code: string): Promise<{ id_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Verify the id_token's signature against Google's published public keys and check
 * issuer/audience — never trust an id_token (or any claims from it) without this.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const email = payload.email as string | undefined;
  if (!email) throw new Error("Google id_token did not include an email");

  return {
    googleId: payload.sub as string,
    email,
    emailVerified: payload.email_verified === true,
    name: (payload.name as string | undefined) ?? email,
    picture: payload.picture as string | undefined,
  };
}

/**
 * Short-lived (10 min), single-purpose token that carries a verified Google profile
 * between the callback and the complete-profile step for first-time sign-ins. Kept
 * separate from the real session token (src/lib/auth.ts) so it can never be mistaken
 * for one — it has no role, so it must not grant access to anything.
 */
export async function signPendingGoogleProfile(profile: GoogleProfile): Promise<string> {
  return new SignJWT({ ...profile, purpose: "google_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyPendingGoogleProfile(token: string): Promise<GoogleProfile | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== "google_pending" || !payload.email || !payload.googleId) return null;
    return {
      googleId: payload.googleId as string,
      email: payload.email as string,
      emailVerified: payload.emailVerified === true,
      name: (payload.name as string) ?? (payload.email as string),
      picture: payload.picture as string | undefined,
    };
  } catch {
    return null;
  }
}
