import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Module } from "@/lib/rbac";
import { Sidebar, type NavItem } from "./_components/sidebar";
import { ModeToggle } from "./_components/mode-toggle";
import { UserMenu } from "./_components/user-menu";

// Nav item + the RBAC module gating its visibility (null = visible to all authenticated users).
const NAV: { href: string; label: string; module: Module | null }[] = [
  { href: "/dashboard", label: "Dashboard", module: null },
  { href: "/fleet", label: "Fleet", module: "fleet" },
  { href: "/drivers", label: "Drivers", module: "drivers" },
  { href: "/trips", label: "Trips", module: "trips" },
  { href: "/maintenance", label: "Maintenance", module: "fleet" }, // maintenance is a fleet concern
  { href: "/fuel-expenses", label: "Fuel & Expenses", module: "fuel" },
  { href: "/analytics", label: "Analytics", module: "analytics" },
  { href: "/settings", label: "Settings", module: null },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login"); // middleware also guards, but this narrows the type

  const user = await prisma.user.findUnique({
    where: { id: Number(session.sub) },
    select: { name: true, role: true },
  });
  if (!user) redirect("/login");

  const items: NavItem[] = NAV.filter(
    (item) => item.module === null || can(user.role, item.module, "view"),
  ).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 border-b px-6">
          <ModeToggle />
          <UserMenu name={user.name} role={user.role} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
