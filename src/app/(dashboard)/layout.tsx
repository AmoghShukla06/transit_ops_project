import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Dashboard shell: sidebar + top bar. Owner: Person A (wire role-based nav visibility +
 * current-user chip + dark-mode toggle). Nav items map to the mockup's sidebar.
 */
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fleet", label: "Fleet" },
  { href: "/drivers", label: "Drivers" },
  { href: "/trips", label: "Trips" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/fuel-expenses", label: "Fuel & Expenses" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r p-4">
        <div className="mb-6 text-xl font-semibold">TransitOps</div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
