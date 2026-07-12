"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [completeTripId, setCompleteTripId] = useState<number | null>(null);

  const { data: trips, isLoading } = useQuery<Trip[]>({ queryKey: ["trips"], queryFn: () => api("/trips") });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api("/vehicles") });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["drivers"], queryFn: () => api("/drivers") });

  const availableVehicles = vehicles?.filter(v => v.status === "available") || [];
  const availableDrivers = drivers?.filter(d => d.status === "available") || [];

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: "", destination: "", cargoWeightKg: 0, plannedDistance: 0 },
  });
  
  const cargoWeight = createForm.watch("cargoWeightKg");
  const vehicleId = createForm.watch("vehicleId");
  const selectedVehicle = vehicles?.find(v => v.id === Number(vehicleId));
  const isOverCapacity = selectedVehicle && cargoWeight > selectedVehicle.maxCapacityKg;

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api("/trips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success("Draft trip created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }: { id: number, action: string, payload?: Record<string, unknown> }) =>
      api(`/trips/${id}`, { method: "POST", body: JSON.stringify({ action, ...payload }) }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      if (variables.action === "complete") setCompleteTripId(null);
      toast.success(`Trip ${variables.action}ed successfully`);
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
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-500/10 text-gray-500";
      case "dispatched": return "bg-blue-500/10 text-blue-500";
      case "completed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trip Dispatcher</h1>
          <p className="text-sm text-muted-foreground">Create trips, assign resources, and monitor live board.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) createForm.reset(); }}>
          <DialogTrigger asChild><Button>Create Trip</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Draft Trip</DialogTitle></DialogHeader>
            <form onSubmit={createForm.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Source</label><Input {...createForm.register("source")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Destination</label><Input {...createForm.register("destination")} /></div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle</label>
                  <Select onValueChange={(v) => createForm.setValue("vehicleId", Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.regNo} ({v.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Driver</label>
                  <Select onValueChange={(v) => createForm.setValue("driverId", Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      {availableDrivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2"><label className="text-sm font-medium">Cargo Weight (kg)</label><Input type="number" {...createForm.register("cargoWeightKg")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Distance (km)</label><Input type="number" {...createForm.register("plannedDistance")} /></div>
              </div>
              
              {isOverCapacity && (
                <div className="text-red-500 text-sm font-medium p-2 bg-red-500/10 rounded">
                  Warning: Cargo ({cargoWeight}kg) exceeds vehicle capacity ({selectedVehicle.maxCapacityKg}kg).
                </div>
              )}

              <Button type="submit" disabled={createMutation.isPending || !!isOverCapacity} className="w-full">
                Save Draft
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle & Driver</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : trips?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No trips found.</TableCell></TableRow>
            ) : (
              trips?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.code}</TableCell>
                  <TableCell>
                    <div>{t.source}</div>
                    <div className="text-xs text-muted-foreground">to {t.destination}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{t.vehicle?.regNo || 'Unassigned'}</div>
                    <div className="text-xs text-muted-foreground">{t.driver?.name || 'Unassigned'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{t.cargoWeightKg} kg</div>
                    <div className="text-xs text-muted-foreground">{t.plannedDistance} km</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(t.status)}>{t.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {t.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ id: t.id, action: "dispatch" })} disabled={actionMutation.isPending}>
                        Dispatch
                      </Button>
                    )}
                    {t.status === "dispatched" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => setCompleteTripId(t.id)}>Complete</Button>
                        <Button size="sm" variant="destructive" onClick={() => actionMutation.mutate({ id: t.id, action: "cancel" })}>Cancel</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={completeTripId !== null} onOpenChange={(open) => !open && setCompleteTripId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Trip</DialogTitle></DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Odometer</label>
              <Input name="finalOdometer" type="number" required step="0.1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fuel Consumed (Liters)</label>
              <Input name="fuelConsumed" type="number" required step="0.1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fuel Cost</label>
              <Input name="fuelCost" type="number" required step="0.01" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleteTripId(null)}>Cancel</Button>
              <Button type="submit" disabled={actionMutation.isPending}>Complete Trip</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
