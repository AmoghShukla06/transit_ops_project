"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";

const ROLE_LABELS: Record<string, string> = {
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

export function UserMenu({ name, role, picture }: { name: string; role: string; picture?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await api("/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-lg py-1.5 pl-2.5 pr-1.5 transition-colors hover:bg-accent"
      >
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium leading-tight">{name}</div>
          <Badge variant="secondary" className="mt-1">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        </div>
        <UserAvatar name={name} picture={picture} className="h-9 w-9 shrink-0 text-xs" />
      </Link>
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut} loading={loading}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
