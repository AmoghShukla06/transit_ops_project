"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route as RouteIcon,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type NavItem = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/fleet": Truck,
  "/drivers": Users,
  "/trips": RouteIcon,
  "/maintenance": Wrench,
  "/fuel-expenses": Fuel,
  "/analytics": BarChart3,
  "/settings": Settings,
};

const SIDEBAR_COLLAPSED_KEY = "transitops:sidebar-collapsed";

/** Shared nav-item list, reused by the desktop sidebar and the mobile drawer. */
export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
              collapsed && "justify-center px-0",
              active
                ? "translate-x-0.5 bg-accent text-accent-foreground"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent/60 hover:text-accent-foreground",
              collapsed && "hover:translate-x-0",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200 ease-out",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
              )}
            />
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar — hidden below md; the mobile drawer takes over on small screens.
 * Collapses to an icon-only rail; the choice persists across sessions. */
export function Sidebar({ items }: { items: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-card/40 p-4 md:flex",
        mounted && "transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-56",
      )}
    >
      <div className={cn("mb-6 flex items-center gap-2 px-2", collapsed && "justify-center px-0")}>
        <Image src="/logo.png?v=2" alt="TransitOps" width={306} height={262} className="h-7 w-auto shrink-0" />
        {!collapsed && <span className="text-xl font-bold tracking-tight">TransitOps</span>}
      </div>

      <SidebarNav items={items} collapsed={collapsed} />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn("mt-auto text-muted-foreground", collapsed ? "self-center" : "self-end")}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </Button>
    </aside>
  );
}
