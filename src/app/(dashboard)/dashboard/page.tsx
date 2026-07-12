"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DashboardData = {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  retiredVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
};

type Trip = {
  id: number; code: string; source: string; destination: string; status: string;
  vehicle?: { regNo: string }; driver?: { name: string }; createdAt: string;
};

const KPI_ITEMS: { key: keyof DashboardData; label: string; suffix?: string; accent?: string }[] = [
  { key: "activeVehicles", label: "Active Vehicles" },
  { key: "availableVehicles", label: "Available Vehicles", accent: "text-emerald-500" },
  { key: "vehiclesInMaintenance", label: "Vehicles In Maintenance", accent: "text-orange-500" },
  { key: "activeTrips", label: "Active Trips" },
  { key: "pendingTrips", label: "Pending Trips" },
  { key: "driversOnDuty", label: "Drivers On Duty" },
  { key: "fleetUtilization", label: "Fleet Utilization", suffix: "%", accent: "text-emerald-500" },
];

export default function DashboardPage() {
  const [region, setRegion] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const queryParams = new URLSearchParams();
  if (region !== "all") queryParams.set("region", region);
  if (type !== "all") queryParams.set("type", type);
  if (status !== "all") queryParams.set("status", status);

  const { data: kpis, isLoading: isLoadingKpis } = useQuery<DashboardData>({
    queryKey: ["dashboard", region, type, status],
    queryFn: () => api(`/dashboard?${queryParams.toString()}`)
  });

  const { data: trips, isLoading: isLoadingTrips } = useQuery<Trip[]>({
    queryKey: ["trips", "recent"],
    queryFn: () => api("/trips")
  });

  const recentTrips = trips?.slice(0, 5) || [];

  const statusBars = [
    { label: "Available", value: kpis?.availableVehicles ?? 0, color: "bg-emerald-500" },
    { label: "On Trip", value: kpis?.activeVehicles ?? 0, color: "bg-blue-500" },
    { label: "In Shop", value: kpis?.vehiclesInMaintenance ?? 0, color: "bg-orange-500" },
    { label: "Retired", value: kpis?.retiredVehicles ?? 0, color: "bg-red-500" },
  ];
  const maxBar = Math.max(1, ...statusBars.map((b) => b.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor fleet utilization, active trips, and driver status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vehicle Type: All</SelectItem>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Mini">Mini</SelectItem>
              <SelectItem value="Car">Car</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="on_trip">On Trip</SelectItem>
              <SelectItem value="in_shop">In Shop</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Region: All</SelectItem>
              <SelectItem value="North">North</SelectItem>
              <SelectItem value="South">South</SelectItem>
              <SelectItem value="East">East</SelectItem>
              <SelectItem value="West">West</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoadingKpis ? (
        <div className="text-center py-4 text-muted-foreground">Loading KPIs...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {KPI_ITEMS.map((item, i) => (
            <Card
              key={item.key}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium leading-tight text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${item.accent ?? ""}`}>
                  {kpis?.[item.key] ?? 0}
                  {item.suffix ?? ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTrips ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Loading trips...</TableCell></TableRow>
                ) : recentTrips.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No recent trips.</TableCell></TableRow>
                ) : (
                  recentTrips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.code}
                        <div className="text-xs font-normal text-muted-foreground">
                          {t.source} → {t.destination}
                        </div>
                      </TableCell>
                      <TableCell>{t.vehicle?.regNo || "—"}</TableCell>
                      <TableCell>{t.driver?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.status.toUpperCase()}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusBars.map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium">{b.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${b.color} transition-[width] duration-700 ease-out`}
                    style={{ width: `${(b.value / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
