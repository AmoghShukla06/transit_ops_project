/**
 * Maintenance (mockup #5, PDF §3.6). Owner: Person B.
 * "Log Service Record" form + service log table. Creating an active record flips the
 * vehicle to In Shop (hidden from dispatch); closing restores it to Available.
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Vehicle {
  id: number;
  regNo: string;
  nameModel: string;
  status: string;
}

interface MaintenanceLog {
  id: number;
  serviceType: string;
  cost: number;
  date: string;
  status: "active" | "closed";
  vehicleId: number;
  vehicle: { regNo: string; nameModel: string };
}

const schema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  serviceType: z.string().min(1, "Service type is required"),
  cost: z.coerce.number().min(0, "Must be ≥ 0"),
  date: z.string().optional(),
});
type FormValues = z.input<typeof schema>;

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["maintenance"],
    queryFn: () => api("/maintenance"),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api("/vehicles"),
  });

  // Any vehicle not already on a trip can go in for service (retired vehicles included,
  // since the service layer keeps retired vehicles retired rather than flipping to in_shop).
  const eligibleVehicles = vehicles.filter((v) => v.status !== "on_trip");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: "", serviceType: "", cost: 0, date: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const parsed = schema.parse(data);
      return api("/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: Number(parsed.vehicleId),
          serviceType: parsed.serviceType,
          cost: parsed.cost,
          date: parsed.date ? new Date(parsed.date).toISOString() : undefined,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Service record logged — vehicle moved to In Shop");
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify({ action: "close" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Maintenance closed — vehicle restored to Available");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const activeCount = logs.filter((l) => l.status === "active").length;
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Log service records and track vehicles in the shop.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) form.reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Log Service Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Service Record</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select onValueChange={(v) => form.setValue("vehicleId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {eligibleVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.regNo} — {v.nameModel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleId && (
                  <p className="text-xs text-destructive">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Input {...form.register("serviceType")} placeholder="Oil Change, Engine Repair..." />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input type="number" {...form.register("cost")} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...form.register("date")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vehicles In Shop</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active maintenance records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalCost)}</div>
            <p className="text-xs text-muted-foreground">{logs.length} records total</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading…</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No service records yet.</TableCell></TableRow>
            ) : (
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    {l.vehicle.regNo}
                    <div className="text-xs text-muted-foreground">{l.vehicle.nameModel}</div>
                  </TableCell>
                  <TableCell>{l.serviceType}</TableCell>
                  <TableCell>{fmt(l.cost)}</TableCell>
                  <TableCell>{fmtDate(l.date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        l.status === "active"
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-green-500/10 text-green-500"
                      }
                    >
                      {l.status === "active" ? "In Shop" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={closeMutation.isPending}
                        onClick={() => closeMutation.mutate(l.id)}
                      >
                        Close
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: In Shop vehicles are removed from the Trip Dispatcher&apos;s selection pool.
      </p>
    </div>
  );
}
