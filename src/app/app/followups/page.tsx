"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { readJson, writeJson } from "@/lib/browserStorage";
import { getFollowUpStatus } from "@/lib/followups";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";
import type { FollowUp } from "@/types";

interface StatusSection {
  key: FollowUp["status"];
  label: string;
  description: string;
  dot: string;
  badge: string;
  rail: string;
}

// Color follows the follow-up's own status, not the original message's
// urgency — overdue is what needs attention on this screen.
const STATUS_SECTIONS: StatusSection[] = [
  {
    key: "overdue",
    label: "Overdue",
    description: "Past their follow-up date",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-700",
    rail: "border-l-[3px] border-l-red-500",
  },
  {
    key: "due_today",
    label: "Due today",
    description: "Scheduled for today",
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    rail: "border-l-[3px] border-l-amber-500",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    description: "Scheduled for a later date",
    dot: "bg-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    rail: "border-l-[3px] border-l-blue-500",
  },
  {
    key: "done",
    label: "Done",
    description: "Completed follow-ups",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rail: "border-l-[3px] border-l-emerald-500",
  },
];

function formatFollowUpDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>(() =>
    readJson<FollowUp[]>(STORAGE_KEYS.followups, []),
  );

  useEffect(() => {
    let active = true;

    async function loadFollowUps() {
      const response = await fetch("/api/followups");
      if (!response.ok) return;

      const payload = (await response.json()) as { followups?: FollowUp[] };

      if (!active || !payload.followups?.length) return;

      setFollowups((current) => {
        const existingIds = new Set(current.map((followup) => followup.id));
        const merged = [
          ...payload.followups!.filter(
            (followup) => !existingIds.has(followup.id),
          ),
          ...current,
        ];
        writeJson(STORAGE_KEYS.followups, merged);
        return merged;
      });
    }

    void loadFollowUps();

    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => {
    const normalized = followups
      .map((followup) => ({
        ...followup,
        status:
          followup.status === "done"
            ? ("done" as const)
            : getFollowUpStatus(followup.followUpDate),
      }))
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

    return STATUS_SECTIONS.map((section) => ({
      ...section,
      items: normalized.filter((followup) => followup.status === section.key),
    })).filter((section) => section.items.length > 0);
  }, [followups]);

  const openCount = useMemo(
    () => followups.filter((followup) => followup.status !== "done").length,
    [followups],
  );

  function markDone(id: string) {
    const next = followups.map((followup) =>
      followup.id === id ? { ...followup, status: "done" as const } : followup,
    );
    setFollowups(next);
    writeJson(STORAGE_KEYS.followups, next);

    const doneFollowUp = next.find((followup) => followup.id === id);

    if (doneFollowUp) {
      void fetch("/api/followups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followup: doneFollowUp }),
      }).catch(() => null);
    }
  }

  if (followups.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No follow-ups yet"
        description="Create follow-ups from board messages or contacts to keep next steps on schedule."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description={`${openCount} open ${
          openCount === 1 ? "follow-up" : "follow-ups"
        }. Reminders are not sent yet — this is a local tracker for the beta.`}
      />

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key}>
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", section.dot)} />
              <h2 className="text-sm font-semibold">{section.label}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {section.items.length}
              </span>
              <span className="text-xs text-muted-foreground">
                · {section.description}
              </span>
            </div>
            <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
              {section.items.map((followup) => (
                <div
                  key={followup.id}
                  className={cn(
                    "rounded-xl border border-border/70 bg-card p-4 shadow-xs",
                    section.rail,
                    section.key === "done" && "opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {followup.person}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {formatFollowUpDate(followup.followUpDate)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        section.badge,
                      )}
                    >
                      {section.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{followup.reason}</p>
                  <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                    {followup.suggestedMessage}
                  </div>
                  {section.key !== "done" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => markDone(followup.id)}
                    >
                      <Check className="size-4" />
                      Mark done
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
