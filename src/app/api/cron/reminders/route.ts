/**
 * License-expiry email reminders (bonus). Owner: Person D.
 * Trigger daily via an external scheduler (cron / GitHub Action / Vercel Cron) that calls
 * this route with header `Authorization: Bearer <CRON_SECRET>`. Sends mail via nodemailer.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const DAYS_AHEAD = 30;
  const now = new Date();
  const cutoff = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  // Find drivers whose license expires within the next 30 days (but hasn't expired yet)
  const expiringDrivers = await prisma.driver.findMany({
    where: {
      licenseExpiry: { gte: now, lte: cutoff },
    },
    select: {
      id: true,
      name: true,
      licenseNo: true,
      licenseExpiry: true,
      contact: true,
    },
  });

  if (expiringDrivers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No expiring licenses in the next 30 days." });
  }

  let sent = 0;
  const results: { driver: string; status: string }[] = [];

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM ?? "noreply@transitops.local";

  if (smtpHost && smtpUser && smtpPass) {
    try {
      // require() with variable to bypass webpack static analysis — nodemailer is optional
      const modName = "nodemailer";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nm = require(modName);
      const transporter = nm.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });

      for (const driver of expiringDrivers) {
        const daysLeft = Math.ceil(
          (driver.licenseExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        try {
          await transporter.sendMail({
            from: mailFrom,
            to: smtpUser, // In production, send to driver's actual email
            subject: `License Expiry Reminder - ${driver.name}`,
            text: [
              `Driver: ${driver.name}`,
              `License: ${driver.licenseNo}`,
              `Expires: ${driver.licenseExpiry.toISOString().slice(0, 10)} (${daysLeft} days)`,
              `Contact: ${driver.contact ?? "N/A"}`,
              "",
              "Please renew the license before expiry to avoid dispatch restrictions.",
            ].join("\n"),
          });
          sent++;
          results.push({ driver: driver.name, status: "sent" });
        } catch (err) {
          results.push({ driver: driver.name, status: `failed: ${(err as Error).message}` });
        }
      }
    } catch {
      // nodemailer not installed — report without sending
      for (const driver of expiringDrivers) {
        results.push({ driver: driver.name, status: "skipped (nodemailer not available)" });
      }
    }
  } else {
    // SMTP not configured — just report the expiring drivers
    for (const driver of expiringDrivers) {
      const daysLeft = Math.ceil(
        (driver.licenseExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      results.push({
        driver: `${driver.name} (${driver.licenseNo}) - expires in ${daysLeft} days`,
        status: "skipped (SMTP not configured)",
      });
    }
  }

  return NextResponse.json({
    sent,
    total: expiringDrivers.length,
    results,
  });
}
