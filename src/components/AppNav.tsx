"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ClipboardList, MessageSquareText, Users } from "lucide-react";

import { LogoLink } from "@/components/LogoLink";
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <LogoLink />
        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                  active &&
                    "bg-card text-primary shadow-sm ring-1 ring-primary/15 hover:bg-card hover:text-primary",
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
