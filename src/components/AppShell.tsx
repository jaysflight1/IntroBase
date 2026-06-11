"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Inbox,
  KanbanSquare,
  LogIn,
  LogOut,
  Plug,
  UserCircle,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/LogoLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/app/board", label: "Board", icon: KanbanSquare },
      { href: "/app/followups", label: "Follow-ups", icon: CalendarClock },
      { href: "/app/contacts", label: "Contacts", icon: Users },
    ],
  },
  {
    label: "Data sources",
    items: [
      { href: "/app/import", label: "Import", icon: Inbox },
      { href: "/app/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-secondary text-secondary-foreground hover:bg-secondary",
      )}
    >
      <Icon className={cn("size-4", active && "text-primary")} />
      {label}
    </Link>
  );
}

interface AppShellProps {
  userEmail?: string | null;
  children: ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/70 bg-card lg:flex">
        <div className="flex h-14 items-center border-b border-border/70 px-4">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={pathname === item.href}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border/70 p-3">
          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/app/account"
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted",
                  pathname === "/app/account" && "bg-secondary",
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium leading-tight">
                    Account
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </span>
              </Link>
              <form action="/auth/sign-out" method="post">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="submit"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogIn className="size-4" />
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <BrandMark />
          {userEmail ? (
            <form action="/auth/sign-out" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {[...navItems, { href: "/app/account", label: "Account", icon: UserCircle }].map(
            (item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-secondary text-secondary-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  {item.label}
                </Link>
              );
            },
          )}
        </nav>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
