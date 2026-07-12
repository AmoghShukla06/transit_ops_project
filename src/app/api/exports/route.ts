/**
 * Report export. Owner: Person D. GET /api/exports?report=vehicles&format=csv|pdf
 * CSV = mandatory (papaparse), PDF = bonus (pdf-lib). Set Content-Disposition to download.
 */
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  totalOperationalCost,
  fleetUtilization,
  fuelEfficiency,
  topCostliestVehicles,
  monthlyRevenue,
  vehicleRoiList,
} from "@/server/services/cost";

type ReportType = "vehicles" | "trips" | "fuel" | "expenses" | "analytics";
type Format = "csv" | "pdf";

// --------------- Data fetchers ---------------

async function fetchReportData(report: ReportType) {
  switch (report) {
    case "vehicles":
      return {
        title: "Vehicles Report",
        rows: (await prisma.vehicle.findMany({ orderBy: { regNo: "asc" } })).map((v) => ({
          "Reg No": v.regNo,
          "Name / Model": v.nameModel,
          Type: v.type,
          "Max Capacity (kg)": v.maxCapacityKg,
          Odometer: v.odometer,
          Status: v.status,
          Region: v.region ?? "",
        })),
      };

    case "trips":
      return {
        title: "Trips Report",
        rows: (
          await prisma.trip.findMany({
            include: { vehicle: { select: { regNo: true } }, driver: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          })
        ).map((t) => ({
          Code: t.code,
          Source: t.source,
          Destination: t.destination,
          "Cargo (kg)": t.cargoWeightKg,
          "Distance (km)": t.plannedDistance,
          Revenue: t.revenue,
          Status: t.status,
          Vehicle: t.vehicle?.regNo ?? "",
          Driver: t.driver?.name ?? "",
        })),
      };

    case "fuel":
      return {
        title: "Fuel Logs Report",
        rows: (
          await prisma.fuelLog.findMany({
            include: { vehicle: { select: { regNo: true, nameModel: true } } },
            orderBy: { date: "desc" },
          })
        ).map((f) => ({
          Date: f.date.toISOString().slice(0, 10),
          Vehicle: f.vehicle.regNo,
          Model: f.vehicle.nameModel,
          "Liters": f.liters,
          "Cost": f.cost,
        })),
      };

    case "expenses":
      return {
        title: "Expenses Report",
        rows: (
          await prisma.expense.findMany({
            include: { trip: { select: { code: true } }, vehicle: { select: { regNo: true } } },
            orderBy: { createdAt: "desc" },
          })
        ).map((e) => ({
          Date: e.createdAt.toISOString().slice(0, 10),
          Toll: e.toll,
          Other: e.other,
          Total: e.toll + e.other,
          Trip: e.trip?.code ?? "",
          Vehicle: e.vehicle?.regNo ?? "",
        })),
      };

    case "analytics": {
      const [opCost, util, eff, costliest, revenue, roi] = await Promise.all([
        totalOperationalCost(),
        fleetUtilization(),
        fuelEfficiency(),
        topCostliestVehicles(10),
        monthlyRevenue(12),
        vehicleRoiList(),
      ]);
      const summaryRows = [
        { Metric: "Fleet Utilization", Value: `${util}%` },
        { Metric: "Fuel Efficiency", Value: `${eff.overall} km/L` },
        { Metric: "Total Fuel Cost", Value: String(opCost.fuelCost) },
        { Metric: "Total Maintenance Cost", Value: String(opCost.maintCost) },
        { Metric: "Total Operational Cost", Value: String(opCost.total) },
      ];
      const revenueRows = revenue.map((r) => ({
        Month: r.month,
        Year: r.year,
        Revenue: r.revenue,
      }));
      const costRows = costliest.map((v) => ({
        "Reg No": v.regNo,
        "Name": v.nameModel,
        "Fuel Cost": v.fuelCost,
        "Maint Cost": v.maintCost,
        "Total Cost": v.total,
      }));
      const roiRows = roi.map((v) => ({
        "Reg No": v.regNo,
        "Name": v.nameModel,
        Revenue: v.revenue,
        "Op. Cost": v.operationalCost,
        "Acq. Cost": v.acquisitionCost,
        "ROI %": v.roi,
      }));
      // Combine into CSV sections via papaparse (flat for CSV; structured for PDF)
      return {
        title: "Analytics Summary Report",
        rows: summaryRows,
        sections: {
          summary: summaryRows,
          monthlyRevenue: revenueRows,
          topCostliest: costRows,
          vehicleRoi: roiRows,
        },
      };
    }
    default:
      return null;
  }
}

// --------------- CSV builder ---------------

function buildCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}

// --------------- PDF builder ---------------

async function buildPdf(
  title: string,
  rows: Record<string, unknown>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections?: Record<string, any[]>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 9;
  const headerSize = 14;
  const margin = 50;

  const addPage = () => {
    const page = doc.addPage([842, 595]); // A4 landscape
    return page;
  };

  const drawTable = (
    tableTitle: string,
    data: Record<string, unknown>[],
    startPage?: ReturnType<typeof addPage>,
    startY?: number,
  ) => {
    if (data.length === 0) return { page: startPage ?? addPage(), y: startY ?? 545 };

    const columns = Object.keys(data[0]);
    const colWidth = (842 - margin * 2) / columns.length;
    let page = startPage ?? addPage();
    let y = startY ?? 545;

    // Table title
    page.drawText(tableTitle, { x: margin, y, font: fontBold, size: 11, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;

    // Column headers
    columns.forEach((col, i) => {
      page.drawText(col, { x: margin + i * colWidth, y, font: fontBold, size: fontSize, color: rgb(0.3, 0.3, 0.3) });
    });
    y -= 14;
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: 842 - margin, y: y + 4 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

    // Rows
    for (const row of data) {
      if (y < margin + 20) {
        page = addPage();
        y = 545;
      }
      columns.forEach((col, i) => {
        const val = String(row[col] ?? "");
        const truncated = val.length > 20 ? val.slice(0, 18) + "…" : val;
        page.drawText(truncated, { x: margin + i * colWidth, y, font, size: fontSize, color: rgb(0.15, 0.15, 0.15) });
      });
      y -= 14;
    }

    return { page, y };
  };

  // Title page header
  let page = addPage();
  page.drawText(title, { x: margin, y: 555, font: fontBold, size: headerSize, color: rgb(0.1, 0.1, 0.3) });
  page.drawText(`Generated: ${new Date().toISOString().slice(0, 10)}`, {
    x: margin,
    y: 538,
    font,
    size: 9,
    color: rgb(0.5, 0.5, 0.5),
  });
  let y = 510;

  if (sections) {
    for (const [sectionTitle, sectionData] of Object.entries(sections)) {
      const label = sectionTitle.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
      const result = drawTable(label, sectionData, page, y);
      page = result.page;
      y = result.y - 20;
      if (y < margin + 60) {
        page = addPage();
        y = 545;
      }
    }
  } else {
    drawTable(title, rows, page, y);
  }

  return doc.save();
}

// --------------- Route Handler ---------------

export async function GET(req: Request) {
  const guard = await requireAccess("analytics", "view");
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const report = url.searchParams.get("report") as ReportType | null;
  const format = (url.searchParams.get("format") ?? "csv") as Format;

  if (!report || !["vehicles", "trips", "fuel", "expenses", "analytics"].includes(report)) {
    return NextResponse.json(
      { detail: "Invalid report. Use: vehicles, trips, fuel, expenses, analytics" },
      { status: 400 },
    );
  }
  if (!["csv", "pdf"].includes(format)) {
    return NextResponse.json({ detail: "Invalid format. Use: csv or pdf" }, { status: 400 });
  }

  const data = await fetchReportData(report);
  if (!data) return NextResponse.json({ detail: "Unknown report" }, { status: 400 });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${report}_report_${dateStr}`;

  if (format === "csv") {
    const csv = buildCsv(data.rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // PDF
  const sections = "sections" in data ? (data as { sections: Record<string, unknown[]> }).sections : undefined;
  const pdfBytes = await buildPdf(data.title, data.rows, sections);
  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
