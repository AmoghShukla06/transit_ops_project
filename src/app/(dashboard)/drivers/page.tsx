"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Driver = {
  id: number;
  name: string;
  licenseNo: string;
  licenseCategory: string;
  licenseExpiry: string;
  contact: string | null;
  safetyScore: number;
  status: "available" | "on_trip" | "off_duty" | "suspended";
};

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  licenseNo: z.string().min(1, "License number is required"),
  licenseCategory: z.string().min(1, "Category is required"),
  licenseExpiry: z.string().min(1, "Expiry is required"),
  contact: z.string().optional(),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => api("/drivers"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", licenseNo: "", licenseCategory: "", licenseExpiry: "", contact: "", safetyScore: 100 },
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormValues) =>
      editingId ? api(`/drivers/${editingId}`, { method: "PATCH", body: JSON.stringify(data) }) : api("/drivers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingId(null);
      toast.success(editingId ? "Driver updated" : "Driver created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = (data: FormValues) => saveMutation.mutate(data);

  const openEdit = (d: Driver) => {
    setEditingId(d.id);
    form.reset({
      name: d.name,
      licenseNo: d.licenseNo,
      licenseCategory: d.licenseCategory,
      licenseExpiry: new Date(d.licenseExpiry).toISOString().split("T")[0],
      contact: d.contact || "",
      safetyScore: d.safetyScore,
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "on_trip": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "off_duty": return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "suspended": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default: return "bg-gray-500";
    }
  };

  const getSafetyColor = (score: number) => {
    if (score >= 90) return "bg-green-500/10 text-green-500";
    if (score >= 70) return "bg-orange-500/10 text-orange-500";
    return "bg-red-500/10 text-red-500";
  };

  const STATUS_LEGEND = [
    { label: "Available", className: "bg-green-500/10 text-green-500" },
    { label: "On Trip", className: "bg-blue-500/10 text-blue-500" },
    { label: "Off Duty", className: "bg-gray-500/10 text-gray-500" },
    { label: "Suspended", className: "bg-red-500/10 text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drivers & Safety Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage drivers, safety scores, and license validity.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { form.reset(); setEditingId(null); }
        }}>
          <DialogTrigger asChild>
            <Button>Add Driver</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Driver" : "Add Driver"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input {...form.register("name")} placeholder="Driver name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">License No.</label>
                  <Input {...form.register("licenseNo")} placeholder="Lic No." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input {...form.register("licenseCategory")} placeholder="HMV, LMV..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiry</label>
                  <Input type="date" {...form.register("licenseExpiry")} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact</label>
                  <Input {...form.register("contact")} placeholder="Phone..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Safety Score</label>
                  <Input type="number" {...form.register("safetyScore")} />
                </div>
              </div>
              <Button type="submit" loading={saveMutation.isPending} className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>License No.</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Safety</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
            ) : drivers?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No drivers found.</TableCell></TableRow>
            ) : (
              drivers?.map((d) => {
                const isExpired = new Date(d.licenseExpiry) < new Date();
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.licenseNo}</TableCell>
                    <TableCell className="text-muted-foreground">{d.licenseCategory}</TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="destructive">EXPIRED</Badge>
                      ) : (
                        new Date(d.licenseExpiry).toLocaleDateString()
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.contact ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getSafetyColor(d.safetyScore)}>
                        {d.safetyScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={d.status} onValueChange={(val) => statusMutation.mutate({ id: d.id, status: val })}>
                        <SelectTrigger className={`w-[130px] h-8 text-xs font-medium border-0 ${getStatusColor(d.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="on_trip">On Trip</SelectItem>
                          <SelectItem value="off_duty">Off Duty</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Status:</span>
        {STATUS_LEGEND.map((s) => (
          <Badge key={s.label} variant="secondary" className={s.className}>{s.label}</Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Rule: Expired license or Suspended status → blocked from trip assignment.
      </p>
    </div>
  );
}
