"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Metrics {
  uniqueActiveUsers: number;
  uniqueAnalyzedUsers: number;
  totalSessions: number;
  repeatSessionUsers: number;
  totalBatches: number;
  totalMessages: number;
  submittedMessages: number;
  importMessagesCreated: number;
  importMessagesDeleted: number;
  importMessagesRequeued: number;
  repeatBatchUsers: number;
  laterDayReturningUsers: number;
  activeUsersLast7Days: number;
  messagesAnalyzedLast7Days: number;
  analysisFailures: number;
  openAiRuns: number;
  fallbackRuns: number;
  repliesCopied: number;
  contactsSaved: number;
  contactsStarred: number;
  contactNotesSaved: number;
  followupsCreated: number;
  messageCardsOpened: number;
  priorityChanges: number;
  messagesReordered: number;
  messagesDeleted: number;
  deadlinesEdited: number;
  suggestedRepliesEdited: number;
  feedbackResponses: number;
  emailsCollected: number;
  sourceTypes: Record<string, number>;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  analysisModels: Record<string, number>;
  usefulRatings: Record<string, number>;
  wouldUseAgain: Record<string, number>;
  willingnessToPay: Record<string, number>;
  willingPaid: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMetrics() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/metrics", {
        headers: { "x-admin-password": password },
      });
      const payload = (await response.json()) as Metrics | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Could not load metrics",
        );
      }
      if (!("uniqueActiveUsers" in payload)) {
        throw new Error("Invalid metrics response");
      }
      setMetrics(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

  const ycText = metrics
    ? `Since applying, I built and launched Introbase, an AI command center for founders' inbound messages. So far, ${metrics.uniqueAnalyzedUsers} users analyzed ${metrics.totalMessages} messages across ${metrics.totalBatches} analyses, ${metrics.repeatBatchUsers} users analyzed multiple times, and ${metrics.feedbackResponses} people submitted feedback. ${metrics.willingPaid} users said they would pay for an expanded version with inbox and DM integrations.`
    : "";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin metrics</h1>
        <p className="mt-2 text-muted-foreground">
          Founder-only dashboard for MVP usage and feedback.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Enter the admin password from env.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="ADMIN_PASSWORD"
          />
          <Button onClick={loadMetrics} disabled={isLoading || !password}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Load metrics
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {metrics ? (
        <>
          <MetricSection
            title="Acquisition and retention"
            items={[
              ["Unique active users", metrics.uniqueActiveUsers],
              ["Total sessions", metrics.totalSessions],
              ["Repeat-session users", metrics.repeatSessionUsers],
              ["Later-day returns", metrics.laterDayReturningUsers],
              ["Active users, last 7 days", metrics.activeUsersLast7Days],
            ]}
          />

          <MetricSection
            title="Message analysis"
            items={[
              ["Import messages created", metrics.importMessagesCreated],
              ["Messages submitted", metrics.submittedMessages],
              ["Messages analyzed", metrics.totalMessages],
              ["Analyses run", metrics.totalBatches],
              ["Users analyzed", metrics.uniqueAnalyzedUsers],
              ["Repeat analysis users", metrics.repeatBatchUsers],
              ["Messages analyzed, last 7 days", metrics.messagesAnalyzedLast7Days],
              ["Analysis failures", metrics.analysisFailures],
              ["OpenAI runs", metrics.openAiRuns],
              ["Fallback parser runs", metrics.fallbackRuns],
            ]}
          />

          <MetricSection
            title="Product activity"
            items={[
              ["Message cards opened", metrics.messageCardsOpened],
              ["Replies copied", metrics.repliesCopied],
              ["Priority changes", metrics.priorityChanges],
              ["Messages reordered", metrics.messagesReordered],
              ["Messages deleted", metrics.messagesDeleted],
              ["Deadlines edited", metrics.deadlinesEdited],
              ["Suggested replies edited", metrics.suggestedRepliesEdited],
              ["Contacts saved", metrics.contactsSaved],
              ["Contacts starred", metrics.contactsStarred],
              ["Contact notes saved", metrics.contactNotesSaved],
              ["Follow-ups created", metrics.followupsCreated],
              ["Import messages deleted", metrics.importMessagesDeleted],
              ["Import messages requeued", metrics.importMessagesRequeued],
            ]}
          />

          <section className="grid gap-4 md:grid-cols-3">
            <Breakdown title="Sources" values={metrics.sourceTypes} />
            <Breakdown title="Categories" values={metrics.categoryCounts} />
            <Breakdown title="Priority mix" values={metrics.priorityCounts} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Breakdown title="Analysis models" values={metrics.analysisModels} />
            <Breakdown title="Usefulness" values={metrics.usefulRatings} />
            <Breakdown title="Would use again" values={metrics.wouldUseAgain} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Breakdown title="Willingness to pay" values={metrics.willingnessToPay} />
            <Card>
              <CardHeader>
                <CardDescription>Feedback forms</CardDescription>
                <CardTitle className="text-3xl">{metrics.feedbackResponses}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Emails collected</CardDescription>
                <CardTitle className="text-3xl">{metrics.emailsCollected}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Suggested YC update text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7">{ycText}</p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}

function MetricSection({
  title,
  items,
}: {
  title: string;
  items: Array<[string, number]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Breakdown({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(values).length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          Object.entries(values).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span>{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
