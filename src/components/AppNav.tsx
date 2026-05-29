"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ClipboardList, MessageSquareText, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/import", label: "Import", icon: MessageSquareText },
  { href: "/app/board", label: "Board", icon: ClipboardList },
  { href: "/app/contacts", label: "Contacts", icon: Users },
  { href: "/app/followups", label: "Follow-ups", icon: Archive },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/app" className="text-lg font-semibold tracking-tight">
          Introbase
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
