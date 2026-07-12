/**
 * Maintenance (mockup #5, PDF §3.6). Owner: Person B.
 * Inline "Log Service Record" form (left) + Service Log table (right). Creating an active
 * record flips the vehicle to In Shop (hidden from dispatch); closing restores it to Available.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="text-sm text-muted-foreground">Log service records and track vehicles in the shop.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Log Service Record */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Service Record</CardTitle>
          </CardHeader>
          <CardContent>
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
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </form>

            {/* Status flow diagram */}
            <div className="mt-6 space-y-2 border-t pt-4 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Available</Badge>
                <span className="text-muted-foreground">— creating active record —</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">In Shop</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">In Shop</Badge>
                <span className="text-muted-foreground">— closing record —</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Available</Badge>
              </div>
              <p className="pt-1 text-muted-foreground">
                Note: In Shop vehicles are removed from the dispatch pool.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Loading…</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No service records yet.</TableCell></TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {l.vehicle.regNo}
                        <div className="text-xs font-normal text-muted-foreground">{l.vehicle.nameModel}</div>
                      </TableCell>
                      <TableCell>{l.serviceType}</TableCell>
                      <TableCell>{fmt(l.cost)}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
