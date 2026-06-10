"use client";

import { useEffect, useMemo, useState } from "react";

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
import {
  getTimingCardClass,
  getTimingPersonClass,
  migrateUrgency,
  priorityToUrgency,
} from "@/lib/replyTiming";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  AnalysisResult,
  ExtractedContact,
  FollowUp,
  Urgency,
} from "@/types";

function statusLabel(status: FollowUp["status"]) {
  if (status === "due_today") return "Due today";
  return status.replace("_", " ");
}

function resolveFollowUpTiming(
  followup: FollowUp,
  contacts: ExtractedContact[],
  analysis: AnalysisResult | null,
): Urgency {
  const message = analysis?.messages.find(
    (item) => item.id === followup.messageId,
  );
  if (message) return migrateUrgency(message.urgency);

  const contact = contacts.find(
    (item) =>
      item.id === followup.contactId ||
      item.name.toLowerCase() === followup.person.toLowerCase(),
  );
  if (contact) return priorityToUrgency(contact.priority);

  return "this_month";
}

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>(() =>
    readJson<FollowUp[]>(STORAGE_KEYS.followups, []),
  );
  const contacts = useMemo(
    () => readJson<ExtractedContact[]>(STORAGE_KEYS.savedContacts, []),
    [],
  );
  const analysis = useMemo(
    () => readJson<AnalysisResult | null>(STORAGE_KEYS.currentAnalysis, null),
    [],
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

  const normalized = useMemo(
    () =>
      followups
        .map((followup) => ({
          ...followup,
          timing: resolveFollowUpTiming(followup, contacts, analysis),
          status:
            followup.status === "done"
              ? "done"
              : getFollowUpStatus(followup.followUpDate),
        }))
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    [followups, contacts, analysis],
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
      <div className="surface-card p-8">
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
          <Card
            key={followup.id}
            className={getTimingCardClass(followup.timing)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className={getTimingPersonClass(followup.timing)}>
                    {followup.person}
                  </CardTitle>
                  <CardDescription>{followup.followUpDate}</CardDescription>
                </div>
                <Badge variant="outline">{statusLabel(followup.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6">{followup.reason}</p>
              <div className="rounded-md border border-primary/15 bg-primary/5 p-3 text-sm leading-6">
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
