import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPendingGoogleProfile, GOOGLE_PENDING_COOKIE } from "@/lib/google-auth";
import { CompleteProfileForm } from "./complete-profile-form";

/**
 * Landing spot after a first-time "Continue with Google" — the identity is already
 * verified (see /api/auth/google/callback), we just need a role before the account
 * is created. Reads the short-lived pending-profile cookie server-side so the
 * verified name/email can't be tampered with by the client.
 */
export default async function CompleteProfilePage() {
  const store = await cookies();
  const token = store.get(GOOGLE_PENDING_COOKIE)?.value;
  const profile = token ? await verifyPendingGoogleProfile(token) : null;

  if (!profile) {
    redirect("/login?error=google_expired");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <CompleteProfileForm name={profile.name} email={profile.email} picture={profile.picture} />
    </div>
  );
}
