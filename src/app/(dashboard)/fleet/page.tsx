/**
 * Vehicle Registry (mockup #2, PDF §3.3). Owner: Person B.
 * CRUD + unique reg-no + type/status/search filters + sortable columns +
 * vehicle document management (bonus, PDF §8).
 */
"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowUpDown, FileText, Plus, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type VehicleStatus = "available" | "on_trip" | "in_shop" | "retired";

interface Vehicle {
  id: number;
  regNo: string;
  nameModel: string;
  type: string;
  maxCapacityKg: number;
  odometer: number;
  acquisitionCost: number;
  status: VehicleStatus;
  region: string | null;
  documentPath: string | null;
}

const schema = z.object({
  regNo: z.string().min(1, "Registration number is required"),
  nameModel: z.string().min(1, "Name/model is required"),
  type: z.string().min(1, "Type is required"),
  maxCapacityKg: z.coerce.number().positive("Must be > 0"),
  odometer: z.coerce.number().min(0).default(0),
  acquisitionCost: z.coerce.number().min(0).default(0),
  region: z.string().optional(),
});
type FormValues = z.input<typeof schema>;

const STATUS_COLOR: Record<VehicleStatus, string> = {
  available: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  on_trip: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  in_shop: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  retired: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

type SortKey = "regNo" | "odometer" | "acquisitionCost" | "maxCapacityKg";

export default function FleetPage() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("regNo");
  const [sortAsc, setSortAsc] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api("/vehicles"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { regNo: "", nameModel: "", type: "", maxCapacityKg: 0, odometer: 0, acquisitionCost: 0, region: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const parsed = schema.parse(data);
      return editingId
        ? api(`/vehicles/${editingId}`, { method: "PATCH", body: JSON.stringify(parsed) })
        : api("/vehicles", { method: "POST", body: JSON.stringify(parsed) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingId(null);
      toast.success(editingId ? "Vehicle updated" : "Vehicle registered");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: VehicleStatus }) =>
      api(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/vehicles/${id}/document`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail ?? "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Document uploaded");
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setUploadingId(null),
  });

  const onSubmit = (data: FormValues) => saveMutation.mutate(data);

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    form.reset({
      regNo: v.regNo,
      nameModel: v.nameModel,
      type: v.type,
      maxCapacityKg: v.maxCapacityKg,
      odometer: v.odometer,
      acquisitionCost: v.acquisitionCost,
      region: v.region ?? "",
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ regNo: "", nameModel: "", type: "", maxCapacityKg: 0, odometer: 0, acquisitionCost: 0, region: "" });
    setIsDialogOpen(true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const types = useMemo(() => Array.from(new Set(vehicles.map((v) => v.type))).sort(), [vehicles]);

  const filtered = useMemo(() => {
    let rows = vehicles;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((v) => v.regNo.toLowerCase().includes(q) || v.nameModel.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") rows = rows.filter((v) => v.type === typeFilter);
    if (statusFilter !== "all") rows = rows.filter((v) => v.status === statusFilter);
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
  }, [vehicles, search, typeFilter, statusFilter, sortKey, sortAsc]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fleet — Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">Register vehicles, track status, and manage documents.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { form.reset(); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Vehicle" : "Register Vehicle"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Registration No.</Label>
                  <Input {...form.register("regNo")} placeholder="GJ01AB1234" />
                  {form.formState.errors.regNo && (
                    <p className="text-xs text-destructive">{form.formState.errors.regNo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Name / Model</Label>
                  <Input {...form.register("nameModel")} placeholder="VAN-05" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input {...form.register("type")} placeholder="Van, Truck, Mini..." />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input {...form.register("region")} placeholder="Gandhinagar" />
                </div>
                <div className="space-y-2">
                  <Label>Max Capacity (kg)</Label>
                  <Input type="number" {...form.register("maxCapacityKg")} />
                </div>
                <div className="space-y-2">
                  <Label>Odometer (km)</Label>
                  <Input type="number" {...form.register("odometer")} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Acquisition Cost</Label>
                  <Input type="number" {...form.register("acquisitionCost")} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search reg no. or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="on_trip">On Trip</SelectItem>
            <SelectItem value="in_shop">In Shop</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("regNo")}>
                  Reg. No. <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Name / Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("maxCapacityKg")}>
                  Capacity <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("odometer")}>
                  Odometer <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("acquisitionCost")}>
                  Acq. Cost <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No vehicles found.</TableCell></TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.regNo}</TableCell>
                  <TableCell>{v.nameModel}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell>{v.maxCapacityKg} kg</TableCell>
                  <TableCell>{v.odometer.toLocaleString()} km</TableCell>
                  <TableCell>{fmt(v.acquisitionCost)}</TableCell>
                  <TableCell>
                    <Select
                      value={v.status}
                      onValueChange={(val) => statusMutation.mutate({ id: v.id, status: val as VehicleStatus })}
                    >
                      <SelectTrigger className={`w-[120px] h-8 text-xs font-medium border-0 ${STATUS_COLOR[v.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on_trip">On Trip</SelectItem>
                        <SelectItem value="in_shop">In Shop</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {v.documentPath ? (
                      <a
                        href={v.documentPath}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> View
                      </a>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={uploadingId === v.id}
                        onClick={() => {
                          setUploadingId(v.id);
                          fileInputRef.current?.setAttribute("data-vehicle-id", String(v.id));
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Hidden file input shared across upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = Number(fileInputRef.current?.getAttribute("data-vehicle-id"));
          if (file && id) uploadMutation.mutate({ id, file });
          e.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        Rule: Registration No. must be unique. Retired/In Shop vehicles are hidden from Trip Dispatcher.
      </p>
    </div>
  );
}
