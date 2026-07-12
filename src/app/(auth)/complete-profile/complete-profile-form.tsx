"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CompleteProfileForm({
  name,
  email,
  picture,
}: {
  name: string;
  email: string;
  picture?: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<string>("dispatcher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/google/complete", { method: "POST", body: JSON.stringify({ role }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <CardHeader className="items-center text-center">
        <UserAvatar name={name} picture={picture} className="h-16 w-16 text-xl" />
        <CardTitle className="mt-3">Welcome, {name.split(" ")[0]}</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              This determines what you can access after signing in.
            </p>
          </div>

          {error && (
            <p className="animate-in fade-in slide-in-from-top-1 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive duration-200">
              ✕ {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Finish Sign-Up
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
