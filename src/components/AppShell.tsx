"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Inbox,
  KanbanSquare,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  UserCircle,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/LogoLink";
import { Button } from "@/components/ui/button";
import { readJson, writeJson } from "@/lib/browserStorage";
import { STORAGE_KEYS } from "@/lib/storageKeys";
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
const mobileNavItems = [
  ...navItems,
  { href: "/app/account", label: "Account", icon: UserCircle },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
        active && "bg-secondary text-secondary-foreground hover:bg-secondary",
      )}
    >
      <Icon className={cn("size-4", active && "text-primary")} />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}

interface AppShellProps {
  userEmail?: string | null;
  children: ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isBoardPage = pathname === "/app/board";

  useEffect(() => {
    void Promise.resolve().then(() => {
      setSidebarCollapsed(
        readJson<boolean>(STORAGE_KEYS.appSidebarCollapsed, false),
      );
    });
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeJson(STORAGE_KEYS.appSidebarCollapsed, next);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-card transition-[width] duration-200 lg:flex",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border/70 px-3",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {sidebarCollapsed ? null : <BrandMark />}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
        <nav
          className={cn(
            "flex-1 overflow-y-auto py-5",
            sidebarCollapsed ? "space-y-4 px-2" : "space-y-6 px-3",
          )}
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className={cn(
                  "px-2.5 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70",
                  sidebarCollapsed && "sr-only",
                )}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={pathname === item.href}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className={cn("border-t border-border/70 p-3", sidebarCollapsed && "px-2")}>
          {userEmail ? (
            <div
              className={cn(
                "flex items-center gap-2",
                sidebarCollapsed && "flex-col",
              )}
            >
              <Link
                href="/app/account"
                prefetch={false}
                title={sidebarCollapsed ? "Account" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted",
                  sidebarCollapsed && "flex-none justify-center",
                  pathname === "/app/account" && "bg-secondary",
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
                <span className={cn("min-w-0", sidebarCollapsed && "sr-only")}>
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
              prefetch={false}
              title={sidebarCollapsed ? "Sign in" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0",
              )}
            >
              <LogIn className="size-4" />
              <span className={cn(sidebarCollapsed && "sr-only")}>
                Sign in
              </span>
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
              prefetch={false}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-secondary text-secondary-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main
        className={cn(
          "transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full py-6 lg:py-8",
            isBoardPage
              ? "max-w-[calc(100vw-1.5rem)] px-2 sm:px-3 lg:px-3"
              : "px-4 sm:px-6",
            !isBoardPage && (sidebarCollapsed ? "max-w-7xl" : "max-w-6xl"),
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
