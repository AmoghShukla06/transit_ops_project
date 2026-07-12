import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can, type Module } from "@/lib/rbac";
import { Sidebar, type NavItem } from "./_components/sidebar";
import { MobileSidebar } from "./_components/mobile-sidebar";
import { ModeToggle } from "./_components/mode-toggle";
import { UserMenu } from "./_components/user-menu";
import { PageTransition } from "./_components/page-transition";

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

  // Everything the shell needs (name + role) lives in the JWT, so rendering the dashboard
  // chrome costs zero database round-trips on every navigation.
  const items: NavItem[] = NAV.filter(
    (item) => item.module === null || can(session.role, item.module, "view"),
  ).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-card/40 px-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <MobileSidebar items={items} />
            <Image src="/logo.png?v=2" alt="TransitOps" width={306} height={262} className="h-6 w-auto" />
            <span className="text-lg font-bold tracking-tight">TransitOps</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ModeToggle />
            <UserMenu name={session.name} role={session.role} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
