/**
 * License-expiry email reminders (bonus, PDF §8). Sends one digest email per Safety
 * Officer — the role responsible for "tracks license validity" (PDF §2) — listing every
 * driver whose license expires within the next 30 days. Drivers only have a phone
 * `contact` in this schema (no email), so Safety Officers are the correct recipients.
 *
 * Trigger daily via an external scheduler (cron / GitHub Action / Vercel Cron) that calls
 * this route with header `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const DAYS_AHEAD = 30;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const expiringDrivers = await prisma.driver.findMany({
    where: { licenseExpiry: { gte: now, lte: cutoff } },
    select: { id: true, name: true, licenseNo: true, licenseExpiry: true, contact: true },
    orderBy: { licenseExpiry: "asc" },
  });

  if (expiringDrivers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No expiring licenses in the next 30 days." });
  }

  const daysLeft = (expiry: Date) =>
    Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  const lines = expiringDrivers.map(
    (d) =>
      `- ${d.name} (License ${d.licenseNo}) expires ${d.licenseExpiry.toISOString().slice(0, 10)} — ${daysLeft(d.licenseExpiry)} day(s) left. Contact: ${d.contact ?? "N/A"}`,
  );
  const body = [
    `${expiringDrivers.length} driver license(s) expiring within ${DAYS_AHEAD} days:`,
    "",
    ...lines,
    "",
    "Renew before expiry — expired/suspended licenses block trip assignment.",
  ].join("\n");

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM ?? "noreply@transitops.local";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({
      sent: 0,
      totalExpiring: expiringDrivers.length,
      message: "SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to send.",
      preview: body,
    });
  }

  const safetyOfficers = await prisma.user.findMany({
    where: { role: "safety_officer" },
    select: { email: true },
  });
  const recipients = safetyOfficers.length > 0 ? safetyOfficers.map((u) => u.email) : [smtpUser];

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const results: { recipient: string; status: string }[] = [];
  let sent = 0;
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from: mailFrom,
        to,
        subject: `TransitOps: ${expiringDrivers.length} driver license(s) expiring soon`,
        text: body,
      });
      sent++;
      results.push({ recipient: to, status: "sent" });
    } catch (err) {
      results.push({ recipient: to, status: `failed: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ sent, totalRecipients: recipients.length, totalExpiring: expiringDrivers.length, results });
}
