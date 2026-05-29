"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readJson, writeJson } from "@/lib/browserStorage";
import { getFollowUpStatus } from "@/lib/followups";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { FollowUp } from "@/types";

function statusLabel(status: FollowUp["status"]) {
  if (status === "due_today") return "Due today";
  return status.replace("_", " ");
}

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>(() =>
    readJson<FollowUp[]>(STORAGE_KEYS.followups, []),
  );

  const normalized = useMemo(
    () =>
      followups
        .map((followup) => ({
          ...followup,
          status:
            followup.status === "done"
              ? "done"
              : getFollowUpStatus(followup.followUpDate),
        }))
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    [followups],
  );

  function markDone(id: string) {
    const next = followups.map((followup) =>
      followup.id === id ? { ...followup, status: "done" as const } : followup,
    );
    setFollowups(next);
    writeJson(STORAGE_KEYS.followups, next);
  }

  if (followups.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8">
        <h1 className="text-2xl font-semibold">Follow-ups</h1>
        <p className="mt-2 text-muted-foreground">
          Create follow-ups from messages or contacts to track next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="mt-2 text-muted-foreground">
          No reminders are sent yet. This is a local tracker for the beta.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {normalized.map((followup) => (
          <Card key={followup.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{followup.person}</CardTitle>
                  <CardDescription>{followup.followUpDate}</CardDescription>
                </div>
                <Badge variant="outline">{statusLabel(followup.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6">{followup.reason}</p>
              <div className="rounded-md border bg-zinc-50 p-3 text-sm leading-6">
                {followup.suggestedMessage}
              </div>
              <Button
                variant="outline"
                disabled={followup.status === "done"}
                onClick={() => markDone(followup.id)}
              >
                Mark done
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
