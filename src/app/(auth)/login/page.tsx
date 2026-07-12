"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google Sign-In isn't configured yet.",
  google_failed: "Google Sign-In failed. Please try again.",
  google_email_unverified: "Your Google account's email isn't verified.",
  google_expired: "Your Google sign-in session expired. Please try again.",
};

/** Surfaces ?error= from a failed Google redirect as a toast. Isolated in its own
 * component + Suspense boundary so useSearchParams() doesn't force the whole page dynamic. */
function GoogleErrorToast() {
  const params = useSearchParams();
  useEffect(() => {
    const error = params.get("error");
    if (!error) return;
    toast.error(GOOGLE_ERROR_MESSAGES[error] ?? "Something went wrong with Google Sign-In.");
  }, [params]);
  return null;
}

/**
 * Login screen (mockup #0) — split brand/form layout with a Role (RBAC) selector.
 * The account's real role always comes from the database; the selector here is a
 * sanity check — if it doesn't match the account, we sign the user back out and
 * surface a clear error rather than silently ignoring the mismatch.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("dispatcher");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api<{ role: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (user.role !== role) {
        await api("/auth/logout", { method: "POST" });
        const picked = ROLES.find((r) => r.value === role)?.label ?? role;
        const actual = ROLES.find((r) => r.value === user.role)?.label ?? user.role;
        setError(`This account is registered as ${actual}, not ${picked}. Select the correct role.`);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <GoogleErrorToast />
      </Suspense>

      {/* Brand panel — solid primary blue so it reads as unmistakably "on brand"
          rather than blending into a neutral gray. */}
      <div className="hidden w-[38%] flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <div className="mb-6 inline-flex rounded-xl bg-primary-foreground/10 p-3">
            <Image src="/logo.png?v=2" alt="TransitOps" width={306} height={262} className="h-11 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TransitOps</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Smart Transport Operations Platform</p>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-primary-foreground/90">One login, four roles:</p>
          <ul className="space-y-1.5 text-sm text-primary-foreground/70">
            {ROLES.map((r) => (
              <li key={r.value} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
                {r.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">TransitOps © 2026 · RBAC Enabled</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Image src="/logo.png?v=2" alt="TransitOps" width={306} height={262} className="h-7 w-auto" />
            <span className="text-xl font-bold tracking-tight text-primary">TransitOps</span>
          </div>
          <h2 className="text-xl font-semibold">Sign in to your account</h2>
          <p className="mb-6 text-sm text-muted-foreground">Enter your credentials to continue</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="raven.k@transitops.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role (RBAC)</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() =>
                  toast.info("Contact your administrator to reset your password.")
                }
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="animate-in fade-in slide-in-from-top-1 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive duration-200">
                ✕ {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-muted-foreground">Or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="/api/auth/google/start">
                <GoogleIcon className="h-4 w-4" /> Continue with Google
              </a>
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/signup" className="font-medium text-foreground underline">
                Sign up
              </Link>
            </p>
          </form>

          <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
            <p className="mb-1.5 font-medium text-foreground">Access is scoped by role after login:</p>
            <ul className="space-y-0.5">
              <li>Fleet Manager → Fleet, Maintenance</li>
              <li>Dispatcher → Dashboard, Trips</li>
              <li>Safety Officer → Drivers, Compliance</li>
              <li>Financial Analyst → Fuel &amp; Expenses, Analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
