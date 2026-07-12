/**
 * Fuel & Expense Management (mockup #6). Owner: Person D.
 * Fuel Logs table + Other Expenses table (stacked, always visible) + auto total
 * operational cost (Fuel + Maintenance, per PDF §3.7 — tolls/misc are shown separately).
 * Fetch /api/fuel-logs, /api/expenses, /api/analytics.
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// --------------- Types ---------------

interface FuelLog {
  id: number;
  vehicleId: number;
  liters: number;
  cost: number;
  date: string;
  vehicle: { regNo: string; nameModel: string };
}

interface Expense {
  id: number;
  toll: number;
  other: number;
  createdAt: string;
  tripId: number | null;
  vehicleId: number | null;
  trip: { id: number; code: string } | null;
  vehicle: { id: number; regNo: string; nameModel: string } | null;
}

interface Vehicle {
  id: number;
  regNo: string;
  nameModel: string;
}

interface Trip {
  id: number;
  code: string;
}

interface AnalyticsSummary {
  operationalCost: { fuelCost: number; maintCost: number; total: number };
}

// --------------- Zod schemas ---------------

const fuelSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  liters: z.string().min(1, "Required").transform(Number).pipe(z.number().positive("Must be positive")),
  cost: z.string().min(1, "Required").transform(Number).pipe(z.number().min(0)),
  date: z.string().optional(),
});
type FuelFormData = z.input<typeof fuelSchema>;

const expenseSchema = z.object({
  toll: z.string().transform(Number).pipe(z.number().min(0)).default("0"),
  other: z.string().transform(Number).pipe(z.number().min(0)).default("0"),
  tripId: z.string().optional(),
  vehicleId: z.string().optional(),
});
type ExpenseFormData = z.input<typeof expenseSchema>;

// --------------- Component ---------------

export default function FuelExpensesPage() {
  const qc = useQueryClient();
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  // ---- Queries ----
  const { data: fuelLogs = [], isLoading: loadingFuel } = useQuery<FuelLog[]>({
    queryKey: ["fuel-logs"],
    queryFn: () => api("/fuel-logs"),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => api("/expenses"),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles-list"],
    queryFn: () => api("/vehicles"),
  });

  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["trips-list"],
    queryFn: () => api("/trips"),
  });

  const { data: analytics } = useQuery<AnalyticsSummary>({
    queryKey: ["analytics"],
    queryFn: () => api("/analytics"),
  });

  // ---- Fuel mutation ----
  const fuelForm = useForm<FuelFormData>({ resolver: zodResolver(fuelSchema) });

  const fuelMutation = useMutation({
    mutationFn: (data: FuelFormData) => {
      const parsed = fuelSchema.parse(data);
      return api("/fuel-logs", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: Number(parsed.vehicleId),
          liters: parsed.liters,
          cost: parsed.cost,
          date: parsed.date ? new Date(parsed.date).toISOString() : undefined,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-logs"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Fuel log added");
      fuelForm.reset();
      setFuelOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Expense mutation ----
  const expenseForm = useForm<ExpenseFormData>({ resolver: zodResolver(expenseSchema) });

  const expenseMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      const parsed = expenseSchema.parse(data);
      return api("/expenses", {
        method: "POST",
        body: JSON.stringify({
          toll: parsed.toll,
          other: parsed.other,
          tripId: parsed.tripId ? Number(parsed.tripId) : undefined,
          vehicleId: parsed.vehicleId ? Number(parsed.vehicleId) : undefined,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
      expenseForm.reset();
      setExpenseOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Helpers ----
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Fuel &amp; Expense Management</h1>
        <div className="flex gap-2">
          <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Log Fuel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader>
              <form onSubmit={fuelForm.handleSubmit((d) => fuelMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel-vehicle">Vehicle</Label>
                  <Select onValueChange={(v) => fuelForm.setValue("vehicleId", v)}>
                    <SelectTrigger id="fuel-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.regNo} — {v.nameModel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fuelForm.formState.errors.vehicleId && (
                    <p className="text-xs text-destructive">{fuelForm.formState.errors.vehicleId.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel-liters">Liters</Label>
                    <Input id="fuel-liters" type="number" step="0.1" {...fuelForm.register("liters")} />
                    {fuelForm.formState.errors.liters && (
                      <p className="text-xs text-destructive">{fuelForm.formState.errors.liters.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel-cost">Fuel Cost (₹)</Label>
                    <Input id="fuel-cost" type="number" step="0.01" {...fuelForm.register("cost")} />
                    {fuelForm.formState.errors.cost && (
                      <p className="text-xs text-destructive">{fuelForm.formState.errors.cost.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel-date">Date (optional)</Label>
                  <Input id="fuel-date" type="date" {...fuelForm.register("date")} />
                </div>
                <Button type="submit" className="w-full" disabled={fuelMutation.isPending}>
                  {fuelMutation.isPending ? "Saving…" : "Save Fuel Log"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
              <form onSubmit={expenseForm.handleSubmit((d) => expenseMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exp-toll">Toll (₹)</Label>
                    <Input id="exp-toll" type="number" step="0.01" defaultValue="0" {...expenseForm.register("toll")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exp-other">Other (₹)</Label>
                    <Input id="exp-other" type="number" step="0.01" defaultValue="0" {...expenseForm.register("other")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-trip">Trip (optional)</Label>
                  <Select onValueChange={(v) => expenseForm.setValue("tripId", v)}>
                    <SelectTrigger id="exp-trip"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-vehicle">Vehicle (optional)</Label>
                  <Select onValueChange={(v) => expenseForm.setValue("vehicleId", v)}>
                    <SelectTrigger id="exp-vehicle"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.regNo} — {v.nameModel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={expenseMutation.isPending}>
                  {expenseMutation.isPending ? "Saving…" : "Save Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ===== Fuel Logs ===== */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Fuel Logs</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Liters</TableHead>
                <TableHead className="text-right">Fuel Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingFuel ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : fuelLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No fuel logs yet.</TableCell>
                </TableRow>
              ) : (
                fuelLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="font-medium">{log.vehicle.regNo}</span>
                      <span className="ml-1 text-muted-foreground text-xs">{log.vehicle.nameModel}</span>
                    </TableCell>
                    <TableCell>{fmtDate(log.date)}</TableCell>
                    <TableCell className="text-right">{log.liters.toFixed(1)} L</TableCell>
                    <TableCell className="text-right font-medium">{fmt(log.cost)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ===== Other Expenses ===== */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Other Expenses (Toll / Misc)</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Toll</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExpenses ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses yet.</TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.trip?.code ?? "—"}</TableCell>
                    <TableCell>{e.vehicle?.regNo ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmt(e.toll)}</TableCell>
                    <TableCell className="text-right">{fmt(e.other)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(e.toll + e.other)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ===== Total Operational Cost ===== */}
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-sm font-medium text-muted-foreground">
          Total Operational Cost (Auto) = Fuel + Maintenance
        </span>
        <span className="text-xl font-bold text-orange-500">
          {fmt(analytics?.operationalCost.total ?? 0)}
        </span>
      </div>
    </div>
  );
}
