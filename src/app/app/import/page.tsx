"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { defaultGoalOptions, sampleInbox } from "@/data/sampleInbox";
import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";
import { logEvent } from "@/lib/logEvent";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { writeJson } from "@/lib/browserStorage";
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
import type { AnalysisResult } from "@/types";

const MAX_CHARS = 25_000;

function ImportView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldLoadSample = searchParams.get("sample") === "1";
  const [rawMessages, setRawMessages] = useState(() =>
    shouldLoadSample ? sampleInbox : "",
  );
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

  function toggleGoal(goal: string) {
    setPrioritize((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  function loadSample() {
    setRawMessages(sampleInbox);
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

      writeJson(STORAGE_KEYS.currentAnalysis, payload);
      writeJson(STORAGE_KEYS.savedContacts, payload.contacts);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Manual paste beta
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Paste messy inbound. Introbase ranks what matters.
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-5" />
              Inbound messages
            </CardTitle>
            <CardDescription>
              Paste emails, LinkedIn DMs, Slack messages, Discord messages, or
              connection requests here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rawMessages}
              onChange={(event) => setRawMessages(event.target.value)}
              className="min-h-[420px] resize-y bg-white font-mono text-sm"
              placeholder={`Source: LinkedIn
From: Maya Chen
Message: Hey, I saw what you're building and would love to talk about a possible pilot with our accelerator.`}
            />
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Separate messages with sender names, source labels, or blank
                lines.
              </span>
              <span className={remainingChars < 0 ? "text-destructive" : ""}>
                {remainingChars.toLocaleString()} characters left
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={analyzeMessages} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Analyze messages
              </Button>
              <Button variant="outline" onClick={loadSample} disabled={isSubmitting}>
                Use sample inbox
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>What should Introbase prioritize?</CardTitle>
            <CardDescription>
              Choose the opportunities that matter most right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {defaultGoalOptions.map((goal) => (
              <label
                key={goal}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm"
              >
                <Checkbox
                  checked={prioritize.includes(goal)}
                  onCheckedChange={() => toggleGoal(goal)}
                />
                {goal}
              </label>
            ))}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">
                Anything else Introbase should know?
              </label>
              <Input
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="I am fundraising, hiring, or managing customers..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-950">
              <ShieldCheck className="size-5" />
              Privacy note
            </CardTitle>
            <CardDescription className="text-blue-900">
              Introbase does not store your raw pasted messages server-side by
              default. The analyzed board is saved locally in this browser.
            </CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border bg-white p-8 text-sm text-muted-foreground">
          Loading import screen...
        </div>
      }
    >
      <ImportView />
    </Suspense>
  );
}
