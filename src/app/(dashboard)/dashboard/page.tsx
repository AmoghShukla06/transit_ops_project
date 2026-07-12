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
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
};

type Trip = {
  id: number; code: string; source: string; destination: string; status: string;
  vehicle?: { regNo: string }; driver?: { name: string }; createdAt: string;
};

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor fleet utilization, active trips, and driver status.</p>
        </div>
        <div className="flex gap-2">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="North">North</SelectItem>
              <SelectItem value="South">South</SelectItem>
              <SelectItem value="East">East</SelectItem>
              <SelectItem value="West">West</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Car">Car</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
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
      </div>

      {isLoadingKpis ? (
        <div className="text-center py-4 text-muted-foreground">Loading KPIs...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.fleetUtilization ?? 0}%</div>
              <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-[width] duration-700 ease-out"
                  style={{ width: `${kpis?.fleetUtilization ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75 ease-out">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.activeTrips ?? 0}</div>
              <p className="text-xs text-muted-foreground">{kpis?.pendingTrips ?? 0} pending drafts</p>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 ease-out">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicle Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.activeVehicles ?? 0} <span className="text-sm font-normal text-muted-foreground">on trip</span></div>
              <p className="text-xs text-muted-foreground">{kpis?.availableVehicles ?? 0} available, {kpis?.vehiclesInMaintenance ?? 0} in shop</p>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 ease-out">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drivers on Duty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.driversOnDuty ?? 0}</div>
              <p className="text-xs text-muted-foreground">Active in fleet</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle & Driver</TableHead>
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
                      <Badge variant="outline">{t.status.toUpperCase()}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
