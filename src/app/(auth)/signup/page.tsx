"use client";

/**
 * Signup screen. Owner: Person A. Mirror the login form and POST to /api/auth/signup
 * with { name, email, password, role }. Add the role <Select> (four RBAC roles).
 */
export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-2 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          TODO(Person A): build the signup form (name, email, password, role) → POST /api/auth/signup.
        </p>
      </div>
    </div>
  );
}
