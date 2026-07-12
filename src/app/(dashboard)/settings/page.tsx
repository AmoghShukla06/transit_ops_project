"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Access = "edit" | "view" | false;
type SettingsResponse = {
  general: { depotName: string; currency: string; distanceUnit: string };
  rbac: Record<string, Record<string, Access>>;
  canEdit: boolean;
};

const MODULES = ["fleet", "drivers", "trips", "fuel", "analytics"] as const;
const ROLE_LABELS: Record<string, string> = {
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

function accessCell(a: Access) {
  if (a === "edit") return <span className="font-semibold text-emerald-500">✓</span>;
  if (a === "view") return <span className="text-muted-foreground">view</span>;
  return <span className="text-muted-foreground">–</span>;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: () => api<SettingsResponse>("/settings"),
  });

  const [form, setForm] = useState({ depotName: "", currency: "", distanceUnit: "" });
  useEffect(() => {
    if (data) setForm(data.general);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api("/settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  const canEdit = data.canEdit;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings & RBAC</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
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
                <Label htmlFor="depotName">Depot name</Label>
                <Input
                  id="depotName"
                  value={form.depotName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, depotName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceUnit">Distance unit</Label>
                <Input
                  id="distanceUnit"
                  value={form.distanceUnit}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, distanceUnit: e.target.value })}
                />
              </div>
              {canEdit ? (
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save changes"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only a Fleet Manager can change these settings.
                </p>
              )}
              {save.isError && (
                <p className="text-sm text-destructive">✕ {(save.error as Error).message}</p>
              )}
              {save.isSuccess && <p className="text-sm text-emerald-500">Saved.</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role-Based Access (RBAC)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {MODULES.map((m) => (
                    <TableHead key={m} className="text-center capitalize">
                      {m}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.rbac).map(([role, access]) => (
                  <TableRow key={role}>
                    <TableCell className="font-medium">{ROLE_LABELS[role] ?? role}</TableCell>
                    {MODULES.map((m) => (
                      <TableCell key={m} className="text-center">
                        {accessCell(access[m])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
