"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

import { defaultGoalOptions, sampleInbox } from "@/data/sampleInbox";
import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";
import {
  emptyAnalysisStats,
  formatAnalyzerLabel,
  recordAnalysisRun,
} from "@/lib/analysis/diagnostics";
import { logEvent } from "@/lib/logEvent";
import { migrateAnalysisResult } from "@/lib/replyTiming";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { readJson, writeJson } from "@/lib/browserStorage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { AnalysisDiagnosticsStats, AnalysisResult } from "@/types";

const MAX_CHARS = 25_000;

function ImportView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldLoadSample = searchParams.get("sample") === "1";
  const [rawMessages, setRawMessages] = useState(
    shouldLoadSample ? sampleInbox : "",
  );
  const [draftReady, setDraftReady] = useState(shouldLoadSample);
  const [prioritize, setPrioritize] = useState<string[]>([
    "Investors",
    "Customers/users",
    "Collaborators",
    "Applications/deadlines",
  ]);
  const [context, setContext] = useState(
    "I am a founder/builder trying to avoid missing important opportunities.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStats, setAnalysisStats] =
    useState<AnalysisDiagnosticsStats>(emptyAnalysisStats);

  const remainingChars = useMemo(
    () => MAX_CHARS - rawMessages.length,
    [rawMessages],
  );

  useEffect(() => {
    void logEvent("started_import");

    if (shouldLoadSample) {
      void logEvent("used_sample_inbox", { source: "query_param" });
    }
  }, [shouldLoadSample]);

  useEffect(() => {
    if (shouldLoadSample) return;

    void Promise.resolve().then(() => {
      const stored = readJson<string>(STORAGE_KEYS.importDraft, "");
      if (stored) setRawMessages(stored);
      setDraftReady(true);
    });
  }, [shouldLoadSample]);

  useEffect(() => {
    if (!draftReady) return;

    writeJson(STORAGE_KEYS.importDraft, rawMessages);
  }, [draftReady, rawMessages]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setAnalysisStats(
        readJson<AnalysisDiagnosticsStats>(
          STORAGE_KEYS.analysisDiagnosticsStats,
          emptyAnalysisStats,
        ),
      );
    });
  }, []);

  function toggleGoal(goal: string) {
    setPrioritize((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  function loadSample() {
    setRawMessages(sampleInbox);
    writeJson(STORAGE_KEYS.importDraft, sampleInbox);
    void logEvent("used_sample_inbox", { source: "button" });
    toast.success("Sample inbox loaded");
  }

  async function analyzeMessages() {
    const trimmed = rawMessages.trim();

    if (!trimmed) {
      toast.error("Paste a few messages first.");
      return;
    }

    if (trimmed.length > MAX_CHARS) {
      toast.error("This batch is too large for the beta.");
      return;
    }

    setIsSubmitting(true);
    void logEvent("submitted_messages", {
      character_count: trimmed.length,
      selected_goal_count: prioritize.length,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_user_id: getAnonymousUserId(),
          session_id: getSessionId(),
          raw_messages: trimmed,
          user_goals: {
            prioritize,
            context,
          },
        }),
      });

      const payload = (await response.json()) as
        | AnalysisResult
        | { error?: string };

      if (!response.ok || ("error" in payload && payload.error)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Introbase could not analyze this batch.",
        );
      }

      if (!("messages" in payload)) {
        throw new Error("Introbase returned an invalid analysis.");
      }

      const analysis = migrateAnalysisResult(payload);
      const nextStats = recordAnalysisRun(
        analysisStats,
        analysis.analysisDiagnostics,
      );

      setAnalysisStats(nextStats);
      writeJson(STORAGE_KEYS.analysisDiagnosticsStats, nextStats);
      writeJson(STORAGE_KEYS.currentAnalysis, analysis);
      writeJson(STORAGE_KEYS.savedContacts, payload.contacts);
      toast.success(formatAnalyzerLabel(analysis.analysisDiagnostics));
      router.push("/app/board");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Introbase could not analyze this batch.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import messages"
        description="Paste inbound from email, LinkedIn, Slack, or anywhere else. Introbase analyzes the batch and ranks every message on your board."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Inbound messages</CardTitle>
            <CardDescription>
              Separate messages with sender names, source labels, or blank
              lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={rawMessages}
              onChange={(event) => setRawMessages(event.target.value)}
              className="min-h-[380px] resize-y bg-card font-mono text-sm"
              placeholder={`Source: LinkedIn
From: Maya Chen
Message: Hey, I saw what you're building and would love to talk about a possible pilot with our accelerator.`}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button onClick={analyzeMessages} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Analyze messages
                </Button>
                <Button
                  variant="outline"
                  onClick={loadSample}
                  disabled={isSubmitting}
                >
                  Use sample inbox
                </Button>
              </div>
              <span
                className={cn(
                  "text-xs tabular-nums text-muted-foreground",
                  remainingChars < 0 && "font-medium text-destructive",
                )}
              >
                {remainingChars.toLocaleString()} characters left
              </span>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                Analysis check
              </CardTitle>
              <CardDescription>
                Local GPT vs basic parser counts for this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Last run
                </p>
                <p className="mt-1 font-medium">
                  {formatAnalyzerLabel(analysisStats.last)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {analysisStats.totalRuns}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">GPT</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {analysisStats.openaiRuns}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Basic</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {analysisStats.fallbackRuns}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Basic parser reasons: {analysisStats.missingApiKeyRuns} missing
                key, {analysisStats.requestFailedRuns} request failed,{" "}
                {analysisStats.invalidResponseRuns} invalid response.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prioritization</CardTitle>
              <CardDescription>
                Tell Introbase which opportunities matter most right now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {defaultGoalOptions.map((goal) => (
                <label
                  key={goal}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={prioritize.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  {goal}
                </label>
              ))}
              <div className="space-y-2 pt-3">
                <label className="text-sm font-medium">
                  Additional context
                </label>
                <Input
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="I am fundraising, hiring, or managing customers..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/40 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-5 text-muted-foreground">
              Introbase does not store your raw pasted messages server-side by
              default. The analyzed board is saved locally in this browser.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 text-sm text-muted-foreground">
          Loading import screen...
        </div>
      }
    >
      <ImportView />
    </Suspense>
  );
}
