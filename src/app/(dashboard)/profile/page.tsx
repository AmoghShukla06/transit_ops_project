"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Me = { id: number; name: string; email: string; role: string; avatarUrl: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => api("/auth/me"),
  });

  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (me) {
      setName(me.name);
      setRole(me.role);
    }
  }, [me]);

  const save = useMutation({
    mutationFn: () => api("/auth/me", { method: "PATCH", body: JSON.stringify({ name, role }) }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      router.refresh(); // re-render the header (name/role/avatar) with the fresh session
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">View and update your account information.</p>
      </div>

      {isLoading || !me ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <UserAvatar name={me.name} picture={me.avatarUrl} className="h-16 w-16 text-xl" />
            <div>
              <CardTitle>{me.name}</CardTitle>
              <CardDescription>{me.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={me.email} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact an administrator to change your email.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Changes what you can access — takes effect immediately.
                </p>
              </div>

              <Button type="submit" loading={save.isPending}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
