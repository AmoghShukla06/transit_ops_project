"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

/** Shared nav-item list, reused by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative block rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
              active
                ? "translate-x-0.5 bg-accent text-accent-foreground"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200 ease-out",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar — hidden below md; the mobile drawer takes over on small screens. */
export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-card/40 p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image src="/logo.png?v=2" alt="TransitOps" width={306} height={262} className="h-7 w-auto" />
        <span className="text-xl font-bold tracking-tight">TransitOps</span>
      </div>
      <SidebarNav items={items} />
    </aside>
  );
}
