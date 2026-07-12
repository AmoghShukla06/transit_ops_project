/**
 * Vehicle Registry (mockup #2). Owner: Person B.
 * Table + Add/Edit dialog + status badges + type/status/reg filters + sorting.
 * Fetch GET /api/vehicles; create POST /api/vehicles; update PATCH /api/vehicles/[id].
 */
"use client";

import { useMemo, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VehicleStatus = "available" | "on_trip" | "in_shop" | "retired";

type Vehicle = {
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
  createdAt: string;
};

type SortKey = "regNo" | "nameModel" | "type" | "maxCapacityKg" | "status";

const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  in_shop: "In Shop",
  retired: "Retired",
};

const STATUS_BADGE_VARIANT: Record<VehicleStatus, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  on_trip: "secondary",
  in_shop: "outline",
  retired: "destructive",
};

const emptyForm = {
  regNo: "",
  nameModel: "",
  type: "",
  maxCapacityKg: "",
  odometer: "",
  acquisitionCost: "",
  region: "",
  status: "available" as VehicleStatus,
};

export default function FleetPage() {
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("regNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const { data: vehicles, isLoading, error } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error("Failed to load vehicles");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create vehicle");
      return data;
    },
    onSuccess: () => {
      toast.success("Vehicle added");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update vehicle");
      return data;
    },
    onSuccess: () => {
      toast.success("Vehicle updated");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete vehicle");
      }
    },
    onSuccess: () => {
      toast.success("Vehicle removed");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/vehicles/${id}/document`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploadingId(null),
  });

  const types = useMemo(() => {
    const set = new Set((vehicles ?? []).map((v) => v.type));
    return Array.from(set);
  }, [vehicles]);

  const filtered = useMemo(() => {
    let list = vehicles ?? [];
    if (typeFilter !== "all") list = list.filter((v) => v.type === typeFilter);
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v) => v.regNo.toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [vehicles, typeFilter, statusFilter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      regNo: v.regNo,
      nameModel: v.nameModel,
      type: v.type,
      maxCapacityKg: String(v.maxCapacityKg),
      odometer: String(v.odometer),
      acquisitionCost: String(v.acquisitionCost),
      region: v.region ?? "",
      status: v.status,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      regNo: form.regNo,
      nameModel: form.nameModel,
      type: form.type,
      maxCapacityKg: Number(form.maxCapacityKg),
      odometer: Number(form.odometer || 0),
      acquisitionCost: Number(form.acquisitionCost || 0),
      region: form.region || undefined,
    };
    if (editing) {
      payload.status = form.status;
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleFileSelect(vehicleId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(vehicleId);
    uploadMutation.mutate({ id: vehicleId, file });
    e.target.value = "";
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fleet — Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">
            {vehicles ? `${vehicles.length} vehicles` : "Loading vehicles…"}
          </p>
        </div>
        <Button onClick={openCreate}>Add Vehicle</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by reg. number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABEL) as VehicleStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">Couldn&apos;t load vehicles. Try refreshing.</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Reg. No" active={sortKey === "regNo"} dir={sortDir} onClick={() => toggleSort("regNo")} />
              <SortableHead label="Name / Model" active={sortKey === "nameModel"} dir={sortDir} onClick={() => toggleSort("nameModel")} />
              <SortableHead label="Type" active={sortKey === "type"} dir={sortDir} onClick={() => toggleSort("type")} />
              <SortableHead label="Capacity (kg)" active={sortKey === "maxCapacityKg"} dir={sortDir} onClick={() => toggleSort("maxCapacityKg")} />
              <SortableHead label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
              <TableHead>Region</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No vehicles match these filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.regNo}</TableCell>
                <TableCell>{v.nameModel}</TableCell>
                <TableCell>{v.type}</TableCell>
                <TableCell>{v.maxCapacityKg}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                </TableCell>
                <TableCell>{v.region ?? "—"}</TableCell>
                <TableCell>
                  {v.documentPath ? (
                    <a
                      href={v.documentPath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline underline-offset-2"
                    >
                      View
                    </a>
                  ) : (
                    <label className="cursor-pointer text-sm underline underline-offset-2 text-muted-foreground">
                      {uploadingId === v.id ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileSelect(v.id, e)}
                        disabled={uploadingId === v.id}
                      />
                    </label>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${v.regNo}? This can't be undone.`)) {
                        deleteMutation.mutate(v.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Registration Number">
              <Input
                value={form.regNo}
                onChange={(e) => setForm((f) => ({ ...f, regNo: e.target.value }))}
                placeholder="GJ01AB4521"
              />
            </Field>
            <Field label="Name / Model">
              <Input
                value={form.nameModel}
                onChange={(e) => setForm((f) => ({ ...f, nameModel: e.target.value }))}
                placeholder="Van-05"
              />
            </Field>
            <Field label="Type">
              <Input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Van, Truck, Mini…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Capacity (kg)">
                <Input
                  type="number"
                  value={form.maxCapacityKg}
                  onChange={(e) => setForm((f) => ({ ...f, maxCapacityKg: e.target.value }))}
                />
              </Field>
              <Field label="Odometer">
                <Input
                  type="number"
                  value={form.odometer}
                  onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Acquisition Cost">
                <Input
                  type="number"
                  value={form.acquisitionCost}
                  onChange={(e) => setForm((f) => ({ ...f, acquisitionCost: e.target.value }))}
                />
              </Field>
              <Field label="Region">
                <Input
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="Gandhinagar"
                />
              </Field>
            </div>
            {editing && (
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((f) => ({ ...f, status: val as VehicleStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as VehicleStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={onClick}
    >
      {label} {active ? (dir === "asc" ? "↑" : "↓") : ""}
    </TableHead>
  );
}