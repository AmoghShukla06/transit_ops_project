"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

type Vehicle = { id: number; regNo: string; maxCapacityKg: number; status: string; type: string };
type Driver = { id: number; name: string; status: string };
type Trip = {
  id: number; code: string; source: string; destination: string; cargoWeightKg: number;
  plannedDistance: number; status: "draft" | "dispatched" | "completed" | "cancelled";
  vehicle?: Vehicle; driver?: Driver; createdAt: string;
};

const createSchema = z.object({
  source: z.string().min(1, "Source required"),
  destination: z.string().min(1, "Destination required"),
  vehicleId: z.coerce.number().optional(),
  driverId: z.coerce.number().optional(),
  cargoWeightKg: z.coerce.number().min(1, "Must be > 0"),
  plannedDistance: z.coerce.number().min(1, "Must be > 0"),
});
type CreateForm = z.infer<typeof createSchema>;

const LIFECYCLE_STEPS = ["Draft", "Dispatched", "Completed", "Cancelled"] as const;

function liveBoardHint(t: Trip) {
  if (t.status === "draft" && (!t.vehicle || !t.driver)) return "Awaiting vehicle/driver";
  if (t.status === "draft") return "Ready to dispatch";
  if (t.status === "dispatched") return "In transit";
  if (t.status === "completed") return "Delivered";
  return "Cancelled";
}

const STATUS_COLOR: Record<Trip["status"], string> = {
  draft: "bg-gray-500/10 text-gray-500",
  dispatched: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [completeTripId, setCompleteTripId] = useState<number | null>(null);

  const { data: trips, isLoading } = useQuery<Trip[]>({ queryKey: ["trips"], queryFn: () => api("/trips") });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api("/vehicles") });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["drivers"], queryFn: () => api("/drivers") });

  const availableVehicles = vehicles?.filter((v) => v.status === "available") || [];
  const availableDrivers = drivers?.filter((d) => d.status === "available") || [];

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: "", destination: "", cargoWeightKg: 0, plannedDistance: 0 },
  });

  const cargoWeight = createForm.watch("cargoWeightKg");
  const vehicleId = createForm.watch("vehicleId");
  const driverId = createForm.watch("driverId");
  const selectedVehicle = vehicles?.find((v) => v.id === Number(vehicleId));
  const isOverCapacity = !!selectedVehicle && cargoWeight > selectedVehicle.maxCapacityKg;
  const canDispatch = !!vehicleId && !!driverId && !isOverCapacity;

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }: { id: number; action: string; payload?: Record<string, unknown> }) =>
      api(`/trips/${id}`, { method: "POST", body: JSON.stringify({ action, ...payload }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      if (variables.action === "complete") setCompleteTripId(null);
      toast.success(`Trip ${variables.action}ed successfully`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api<Trip>("/trips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: async (trip, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      createForm.reset();
      if (variables.vehicleId && variables.driverId) {
        actionMutation.mutate({ id: trip.id, action: "dispatch" });
      } else {
        toast.success("Saved as draft — assign a vehicle and driver to dispatch.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleComplete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    actionMutation.mutate({
      id: completeTripId!,
      action: "complete",
      payload: {
        finalOdometer: Number(fd.get("finalOdometer")),
        fuelConsumed: Number(fd.get("fuelConsumed")),
        fuelCost: Number(fd.get("fuelCost")),
        revenue: Number(fd.get("revenue") || 0),
      },
    });
  };

  const liveTrips = trips ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trip Dispatcher</h1>
        <p className="text-sm text-muted-foreground">Create trips, assign resources, and monitor the live board.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Create panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trip Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center">
              {LIFECYCLE_STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        i === 0 ? "bg-primary" : "bg-muted",
                      )}
                    />
                    <span className={cn("text-[10px]", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                      {step}
                    </span>
                  </div>
                  {i < LIFECYCLE_STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-border" />}
                </div>
              ))}
            </div>

            <h3 className="mb-4 text-sm font-semibold">Create Trip</h3>
            <form
              onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Source</Label>
                <Input {...createForm.register("source")} placeholder="Gandhinagar Depot" />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input {...createForm.register("destination")} placeholder="Ahmedabad Hub" />
              </div>
              <div className="space-y-2">
                <Label>Vehicle (available only)</Label>
                <Select onValueChange={(v) => createForm.setValue("vehicleId", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.regNo} — {v.maxCapacityKg} kg capacity
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Driver (available only)</Label>
                <Select onValueChange={(v) => createForm.setValue("driverId", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {availableDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo Weight (kg)</Label>
                  <Input type="number" {...createForm.register("cargoWeightKg")} />
                </div>
                <div className="space-y-2">
                  <Label>Planned Distance (km)</Label>
                  <Input type="number" {...createForm.register("plannedDistance")} />
                </div>
              </div>

              {isOverCapacity && selectedVehicle && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <p>Vehicle Capacity: {selectedVehicle.maxCapacityKg} kg</p>
                  <p>Cargo Weight: {cargoWeight} kg</p>
                  <p className="font-medium">
                    ✕ Capacity exceeded by {cargoWeight - selectedVehicle.maxCapacityKg} kg — dispatch blocked
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  loading={createMutation.isPending}
                  disabled={isOverCapacity}
                >
                  {canDispatch ? "Create & Dispatch" : "Save Draft"}
                </Button>
                <Button type="button" variant="outline" onClick={() => createForm.reset()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live board */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Board</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : liveTrips.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No trips yet.</p>
            ) : (
              liveTrips.map((t) => (
                <div key={t.id} className="rounded-lg border p-3 transition-colors hover:bg-accent/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{t.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.source} → {t.destination}
                      </p>
                    </div>
                    <Badge variant="secondary" className={STATUS_COLOR[t.status]}>
                      {t.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t.vehicle?.regNo ?? "Unassigned"} / {t.driver?.name ?? "Unassigned"}
                    </span>
                    <span>{liveBoardHint(t)}</span>
                  </div>
                  {(t.status === "draft" || t.status === "dispatched") && (
                    <div className="mt-3 flex gap-2">
                      {t.status === "draft" && t.vehicle && t.driver && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actionMutation.mutate({ id: t.id, action: "dispatch" })}
                          loading={actionMutation.isPending}
                        >
                          Dispatch
                        </Button>
                      )}
                      {t.status === "dispatched" && (
                        <>
                          <Button size="sm" onClick={() => setCompleteTripId(t.id)}>Complete</Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => actionMutation.mutate({ id: t.id, action: "cancel" })}
                            loading={actionMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              On Complete: odometer → fuel log → expenses → Vehicle &amp; Driver Available
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={completeTripId !== null} onOpenChange={(open) => !open && setCompleteTripId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Trip</DialogTitle></DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="space-y-2">
              <Label>Final Odometer</Label>
              <Input name="finalOdometer" type="number" required step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Fuel Consumed (Liters)</Label>
              <Input name="fuelConsumed" type="number" required step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Fuel Cost</Label>
              <Input name="fuelCost" type="number" required step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Trip Revenue</Label>
              <Input name="revenue" type="number" step="0.01" placeholder="0" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleteTripId(null)}>Cancel</Button>
              <Button type="submit" loading={actionMutation.isPending}>Complete Trip</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
