/**
 * Reports & Analytics (mockup #7). Owner: Person D.
 * KPI cards + Recharts (monthly revenue, top costliest vehicles) + CSV/PDF export buttons.
 * Fetch GET /api/analytics; export via GET /api/exports.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Gauge, Fuel, DollarSign, Download, FileText, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// --------------- Types ---------------

interface AnalyticsData {
  fleetUtilization: number;
  fuelEfficiency: number;
  operationalCost: { fuelCost: number; maintCost: number; total: number };
  monthlyRevenue: { month: number; year: number; revenue: number }[];
  topCostliestVehicles: {
    vehicleId: number;
    regNo: string;
    nameModel: string;
    fuelCost: number;
    maintCost: number;
    total: number;
  }[];
  vehicleRoi: {
    vehicleId: number;
    regNo: string;
    nameModel: string;
    revenue: number;
    operationalCost: number;
    acquisitionCost: number;
    roi: number;
  }[];
}

// --------------- Helpers ---------------

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


// --------------- Component ---------------

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => api("/analytics"),
  });

  const handleExport = (format: "csv" | "pdf") => {
    window.open(`/api/exports?report=analytics&format=${format}`, "_blank");
  };

  // Prepare chart data
  const revenueChartData = (data?.monthlyRevenue ?? []).map((r) => ({
    name: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    revenue: r.revenue,
  }));

  const costChartData = (data?.topCostliestVehicles ?? []).map((v) => ({
    name: v.regNo,
    fuel: v.fuelCost,
    maintenance: v.maintCost,
  }));

  const roiList = data?.vehicleRoi ?? [];
  const avgRoi = roiList.length > 0 ? roiList.reduce((s, v) => s + v.roi, 0) / roiList.length : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Reports &amp; Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-8 w-20 animate-pulse rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6"><div className="h-64 animate-pulse rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header + Export ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Reports &amp; Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="mr-1 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* ---------- KPI Cards ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.fleetUtilization ?? 0}%</div>
            <p className="text-xs text-muted-foreground">Vehicles currently on trip</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fuel Efficiency</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.fuelEfficiency ?? 0} km/L</div>
            <p className="text-xs text-muted-foreground">Avg across completed trips</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operational Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.operationalCost.total ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              Fuel {fmt(data?.operationalCost.fuelCost ?? 0)} + Maint {fmt(data?.operationalCost.maintCost ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vehicle ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", avgRoi >= 0 ? "text-emerald-500" : "text-destructive")}>
              {avgRoi.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Fleet average, all vehicles</p>
          </CardContent>
        </Card>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      {/* ---------- Charts ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No completed trips with revenue data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Bar dataKey="revenue" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Costliest Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Costliest Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {costChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No cost data available yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Legend />
                  <Bar dataKey="fuel" stackId="a" fill="hsl(220, 70%, 55%)" radius={[0, 0, 0, 0]} name="Fuel" />
                  <Bar dataKey="maintenance" stackId="a" fill="hsl(340, 65%, 55%)" radius={[4, 4, 0, 0]} name="Maintenance" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Vehicle ROI ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle ROI</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.vehicleRoi ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No vehicles yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Operational Cost</TableHead>
                  <TableHead>Acquisition Cost</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.vehicleRoi ?? []).map((v) => (
                  <TableRow key={v.vehicleId}>
                    <TableCell className="font-medium">
                      {v.regNo}
                      <div className="text-xs text-muted-foreground">{v.nameModel}</div>
                    </TableCell>
                    <TableCell>{fmt(v.revenue)}</TableCell>
                    <TableCell>{fmt(v.operationalCost)}</TableCell>
                    <TableCell>{fmt(v.acquisitionCost)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${v.roi >= 0 ? "text-emerald-500" : "text-destructive"}`}
                    >
                      {v.roi}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
