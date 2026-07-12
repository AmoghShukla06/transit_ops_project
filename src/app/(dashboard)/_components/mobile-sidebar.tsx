"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav, type NavItem } from "./sidebar";

/** Hamburger + slide-in drawer for small screens; the desktop <Sidebar> is hidden here. */
export function MobileSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 animate-in fade-in bg-background/80 backdrop-blur-sm duration-200"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 animate-in slide-in-from-left flex-col border-r bg-card p-4 duration-300 ease-out">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="text-xl font-bold tracking-tight">TransitOps</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav items={items} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
