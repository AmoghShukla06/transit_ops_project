/**
 * Maintenance Workflow (mockup #5). Owner: Person B.
 * "Log Service Record" form + service log table with close action.
 * Fetch GET /api/maintenance; create POST /api/maintenance; close PATCH /api/maintenance/[id].
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MaintenanceStatus = "active" | "closed";

type MaintenanceLog = {
  id: number;
  serviceType: string;
  cost: number;
  date: string;
  status: MaintenanceStatus;
  vehicleId: number;
  vehicle: { regNo: string; nameModel: string };
};

type Vehicle = {
  id: number;
  regNo: string;
  nameModel: string;
  status: string;
};

const emptyForm = {
  vehicleId: "",
  serviceType: "",
  cost: "",
  date: "",
};

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [closingId, setClosingId] = useState<number | null>(null);

  const { data: logs, isLoading: logsLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to load maintenance logs");
      return res.json();
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error("Failed to load vehicles");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to log service record");
      return data;
    },
    onSuccess: () => {
      toast.success("Service record logged — vehicle marked In Shop");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to close maintenance record");
      return data;
    },
    onSuccess: () => {
      toast.success("Service closed — vehicle back to Available");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setClosingId(null),
  });

  function handleSubmit() {
    if (!form.vehicleId || !form.serviceType || !form.cost) {
      toast.error("Vehicle, service type, and cost are required");
      return;
    }
    createMutation.mutate({
      vehicleId: Number(form.vehicleId),
      serviceType: form.serviceType,
      cost: Number(form.cost),
      date: form.date || undefined,
    });
  }

  function handleClose(id: number) {
    setClosingId(id);
    closeMutation.mutate(id);
  }

  const activeCount = (logs ?? []).filter((l) => l.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          {logsLoading ? "Loading…" : `${activeCount} vehicle(s) currently in shop`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Service Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Vehicle">
              <Select
                value={form.vehicleId}
                onValueChange={(val) => setForm((f) => ({ ...f, vehicleId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles ?? [])
                    .filter((v) => v.status !== "retired")
                    .map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.regNo} — {v.nameModel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Service Type">
              <Input
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
                placeholder="Oil Change, Engine Repair…"
              />
            </Field>
            <Field label="Cost">
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="1500"
              />
            </Field>
            <Field label="Date (optional)">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Logging…" : "Log Service Record"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Logging a record marks the vehicle as In Shop and hides it from dispatch until closed.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!logsLoading && (logs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No service records yet.
                </TableCell>
              </TableRow>
            )}
            {(logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {log.vehicle.regNo} — {log.vehicle.nameModel}
                </TableCell>
                <TableCell>{log.serviceType}</TableCell>
                <TableCell>₹{log.cost.toLocaleString()}</TableCell>
                <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "active" ? "secondary" : "outline"}>
                    {log.status === "active" ? "Active" : "Closed"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {log.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClose(log.id)}
                      disabled={closingId === log.id}
                    >
                      {closingId === log.id ? "Closing…" : "Close"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}