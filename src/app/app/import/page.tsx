"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { defaultGoalOptions, sampleInbox } from "@/data/sampleInbox";
import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";
import {
  emptyAnalysisStats,
  formatAnalyzerLabel,
  recordAnalysisRun,
} from "@/lib/analysis/diagnostics";
import { readJson, writeJson } from "@/lib/browserStorage";
import { logEvent } from "@/lib/logEvent";
import { makeClientId } from "@/lib/normalize";
import { migrateAnalysisResult } from "@/lib/replyTiming";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type {
  AnalysisDiagnosticsStats,
  AnalysisResult,
  AnalyzedMessage,
  ExtractedContact,
} from "@/types";

const MAX_CHARS = 25_000;

type DraftStatus = "draft" | "analyzing" | "analyzed" | "failed";
type MessageList = "active" | "previous";

interface ImportMessageDraft {
  id: string;
  body: string;
  sender: string;
  source: string;
  notes: string;
  status: DraftStatus;
  analyzedAt?: string;
}

interface DraggedMessage {
  id: string;
  list: MessageList;
}

function createDraftMessage(
  patch: Partial<ImportMessageDraft> = {},
): ImportMessageDraft {
  return {
    id: makeClientId("import"),
    body: "",
    sender: "",
    source: "",
    notes: "",
    status: "draft",
    ...patch,
  };
}

function field(block: string, label: string): string {
  const match = block.match(new RegExp(`^["']?${label}:\\s*(.+?)["']?$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function stripMetadataLines(block: string): string {
  return block
    .replace(/^["']?Source:.+?["']?$/gim, "")
    .replace(/^["']?From:.+?["']?$/gim, "")
    .replace(/^["']?Notes?:.+?["']?$/gim, "")
    .trim();
}

function splitRawMessages(rawMessages: string): string[] {
  const normalized = rawMessages.replace(/\r\n?/g, "\n");
  const hasMarkers =
    /^["']?(?:Source|From|Message):\s*/im.test(normalized) ||
    /^Dear\s+.+,\s*$/im.test(normalized);

  if (!hasMarkers) {
    return normalized
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  const blocks: string[] = [];
  let current: string[] = [];
  const lines = normalized.split("\n");

  function currentHasMessageLabel() {
    return current.some((line) => /^["']?Message:\s*/i.test(line.trim()));
  }

  function currentHasContent() {
    return current.some((line) => {
      const trimmed = line.trim();
      return trimmed && !/^["']?(?:Source|From):\s*/i.test(trimmed);
    });
  }

  function markerStartsStructuredRecord(index: number) {
    const firstLine = lines[index]?.trim() ?? "";
    if (!/^["']?(?:Source|From):\s*/i.test(firstLine)) return false;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor].trim();
      if (!nextLine) continue;
      if (/^Dear\s+.+,\s*$/i.test(nextLine)) return false;
      if (/^["']?Message:\s*/i.test(nextLine)) return true;
      if (/^["']?Source:\s*/i.test(nextLine)) return false;
    }

    return false;
  }

  function flushCurrent() {
    const block = current.join("\n").trim();
    if (block) blocks.push(block);
    current = [];
  }

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    const startsDearMessage = /^Dear\s+.+,\s*$/i.test(trimmed);
    const startsLabeledMessage =
      /^["']?(?:Source|From):\s*/i.test(trimmed) &&
      (currentHasMessageLabel() || markerStartsStructuredRecord(index));

    if (
      current.length > 0 &&
      ((startsDearMessage && currentHasContent()) ||
        (startsLabeledMessage && currentHasContent()))
    ) {
      flushCurrent();
    }

    current.push(line);
  }

  flushCurrent();
  return blocks.slice(0, 50);
}

function cleanSenderName(value: string): string {
  return value
    .replace(/^[-–—\s]+/, "")
    .replace(/[.,;:\s]+$/, "")
    .trim();
}

function extractSignatureSender(block: string): string {
  const lines = stripMetadataLines(block)
    .replace(/^Message:\s*/gim, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const closingIndex = lines.findIndex((line) =>
    /^(best|thanks|thank you|regards|sincerely),?$/i.test(line),
  );

  if (closingIndex === -1) return "";
  return cleanSenderName(lines[closingIndex + 1] ?? "");
}

function messageBody(block: string): string {
  const lines = stripMetadataLines(block)
    .replace(/^Message:\s*/gim, "")
    .split("\n")
    .map((line) => line.trim());
  const firstContentIndex = lines.findIndex(Boolean);

  if (
    firstContentIndex !== -1 &&
    /^Dear\s+.+,\s*$/i.test(lines[firstContentIndex])
  ) {
    lines.splice(firstContentIndex, 1);
  }

  const closingIndex = lines.findIndex((line) =>
    /^(best|thanks|thank you|regards|sincerely),?$/i.test(line),
  );

  if (closingIndex !== -1) lines.splice(closingIndex);

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseRawIntoDrafts(rawMessages: string): ImportMessageDraft[] {
  const drafts = splitRawMessages(rawMessages)
    .map((block) => {
      const sender = field(block, "From") || extractSignatureSender(block);
      return createDraftMessage({
        body: messageBody(block),
        sender,
        source: field(block, "Source"),
      });
    })
    .filter((message) => message.body.trim());

  return drafts.length > 0 ? drafts : [createDraftMessage()];
}

function serializeMessageDraft(message: ImportMessageDraft) {
  return [
    message.source.trim() ? `Source: ${message.source.trim()}` : "",
    message.sender.trim() ? `From: ${message.sender.trim()}` : "",
    message.notes.trim() ? `Notes: ${message.notes.trim()}` : "",
    `Message: ${message.body.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function combineAnalysisResults(results: AnalysisResult[]): AnalysisResult {
  const messages: AnalyzedMessage[] = results.flatMap((result, resultIndex) =>
    result.messages.map((message) => ({
      ...message,
      id: `msg_${resultIndex + 1}_${message.id}`,
    })),
  );
  const contacts: ExtractedContact[] = results.flatMap((result, resultIndex) =>
    result.contacts.map((contact) => ({
      ...contact,
      id: `contact_${resultIndex + 1}_${contact.id}`,
    })),
  );
  const categoryCounts = messages.reduce<Record<string, number>>(
    (counts, message) => {
      counts[message.category] = (counts[message.category] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const fallbackDiagnostic = results
    .map((result) => result.analysisDiagnostics)
    .find((diagnostics) => diagnostics?.engine === "fallback");
  const lastDiagnostics = results.at(-1)?.analysisDiagnostics;

  return migrateAnalysisResult({
    messages,
    contacts,
    sourceTypes: Array.from(
      new Set(messages.map((message) => message.source).filter(Boolean)),
    ),
    categoryCounts,
    messageCount: messages.length,
    analysisDiagnostics: fallbackDiagnostic ?? lastDiagnostics,
  });
}

function updateDraftStatus(
  messages: ImportMessageDraft[],
  id: string,
  status: DraftStatus,
) {
  return messages.map((message) =>
    message.id === id
      ? {
          ...message,
          status,
          analyzedAt:
            status === "analyzed" ? new Date().toISOString() : message.analyzedAt,
        }
      : message,
  );
}

function ImportView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldLoadSample = searchParams.get("sample") === "1";
  const [activeMessages, setActiveMessages] = useState<ImportMessageDraft[]>([]);
  const [previousMessages, setPreviousMessages] = useState<ImportMessageDraft[]>(
    [],
  );
  const [draftReady, setDraftReady] = useState(false);
  const [draggedMessage, setDraggedMessage] = useState<DraggedMessage | null>(
    null,
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
  const [completedCount, setCompletedCount] = useState(0);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [analysisStats, setAnalysisStats] =
    useState<AnalysisDiagnosticsStats>(emptyAnalysisStats);

  const totalChars = useMemo(
    () =>
      activeMessages.reduce(
        (total, message) =>
          total +
          message.body.length +
          message.sender.length +
          message.source.length +
          message.notes.length,
        0,
      ),
    [activeMessages],
  );
  const remainingChars = MAX_CHARS - totalChars;
  const progressValue =
    analysisTotal > 0 ? Math.round((completedCount / analysisTotal) * 100) : 0;

  useEffect(() => {
    void logEvent("started_import");

    if (shouldLoadSample) {
      void logEvent("used_sample_inbox", { source: "query_param" });
    }
  }, [shouldLoadSample]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setPreviousMessages(
        readJson<ImportMessageDraft[]>(
          STORAGE_KEYS.previousImportMessages,
          [],
        ),
      );
      setAnalysisStats(
        readJson<AnalysisDiagnosticsStats>(
          STORAGE_KEYS.analysisDiagnosticsStats,
          emptyAnalysisStats,
        ),
      );

      if (shouldLoadSample) {
        setActiveMessages(parseRawIntoDrafts(sampleInbox));
      } else {
        const storedMessages = readJson<ImportMessageDraft[] | null>(
          STORAGE_KEYS.importDraftMessages,
          null,
        );

        if (storedMessages?.length) {
          setActiveMessages(storedMessages);
        } else {
          const legacyDraft = readJson<string>(STORAGE_KEYS.importDraft, "");
          setActiveMessages(
            legacyDraft.trim()
              ? parseRawIntoDrafts(legacyDraft)
              : [createDraftMessage()],
          );
        }
      }

      setDraftReady(true);
    });
  }, [shouldLoadSample]);

  useEffect(() => {
    if (!draftReady) return;
    writeJson(STORAGE_KEYS.importDraftMessages, activeMessages);
  }, [activeMessages, draftReady]);

  useEffect(() => {
    if (!draftReady) return;
    writeJson(STORAGE_KEYS.previousImportMessages, previousMessages);
  }, [draftReady, previousMessages]);

  function toggleGoal(goal: string) {
    setPrioritize((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  function updateMessage(
    list: MessageList,
    messageId: string,
    patch: Partial<ImportMessageDraft>,
  ) {
    const setter = list === "active" ? setActiveMessages : setPreviousMessages;
    setter((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              ...patch,
              status:
                list === "active" && message.status !== "analyzing"
                  ? "draft"
                  : message.status,
            }
          : message,
      ),
    );
  }

  function addMessage() {
    setActiveMessages((current) => [...current, createDraftMessage()]);
  }

  function loadSample() {
    const drafts = parseRawIntoDrafts(sampleInbox);
    setActiveMessages(drafts);
    writeJson(STORAGE_KEYS.importDraftMessages, drafts);
    void logEvent("used_sample_inbox", { source: "button" });
    toast.success("Sample messages loaded");
  }

  function removeMessage(message: DraggedMessage) {
    if (message.list === "active") {
      setActiveMessages((current) =>
        current.filter((item) => item.id !== message.id),
      );
    } else {
      setPreviousMessages((current) =>
        current.filter((item) => item.id !== message.id),
      );
    }
  }

  function movePreviousToActive(messageId: string) {
    const message = previousMessages.find((item) => item.id === messageId);
    if (!message) return;

    setPreviousMessages((current) =>
      current.filter((item) => item.id !== messageId),
    );
    setActiveMessages((current) => [
      ...current,
      {
        ...message,
        id: makeClientId("import"),
        status: "draft",
      },
    ]);
  }

  function handleDropToActive(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (draggedMessage?.list !== "previous") return;
    movePreviousToActive(draggedMessage.id);
    setDraggedMessage(null);
  }

  function handleDropToTrash(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggedMessage) return;
    removeMessage(draggedMessage);
    setDraggedMessage(null);
  }

  async function analyzeMessages() {
    const pending = activeMessages.filter((message) => message.body.trim());

    if (pending.length === 0) {
      toast.error("Add at least one message first.");
      return;
    }

    if (totalChars > MAX_CHARS) {
      toast.error("This batch is too large for the beta.");
      return;
    }

    setIsSubmitting(true);
    setCompletedCount(0);
    setAnalysisTotal(pending.length);
    void logEvent("submitted_messages", {
      character_count: totalChars,
      selected_goal_count: prioritize.length,
      message_count: pending.length,
    });

    const results: AnalysisResult[] = [];
    let nextStats = analysisStats;

    try {
      for (const message of pending) {
        setActiveMessages((current) =>
          updateDraftStatus(current, message.id, "analyzing"),
        );

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymous_user_id: getAnonymousUserId(),
            session_id: getSessionId(),
            raw_messages: serializeMessageDraft(message),
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
          setActiveMessages((current) =>
            updateDraftStatus(current, message.id, "failed"),
          );
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Introbase could not analyze this message.",
          );
        }

        if (!("messages" in payload)) {
          setActiveMessages((current) =>
            updateDraftStatus(current, message.id, "failed"),
          );
          throw new Error("Introbase returned an invalid analysis.");
        }

        const analysis = migrateAnalysisResult(payload);
        results.push(analysis);
        nextStats = recordAnalysisRun(nextStats, analysis.analysisDiagnostics);
        setAnalysisStats(nextStats);
        writeJson(STORAGE_KEYS.analysisDiagnosticsStats, nextStats);
        setCompletedCount((current) => current + 1);
        setActiveMessages((current) =>
          updateDraftStatus(current, message.id, "analyzed"),
        );
      }

      const combined = combineAnalysisResults(results);
      const analyzedDrafts = pending.map((message) => ({
        ...message,
        status: "analyzed" as const,
        analyzedAt: new Date().toISOString(),
      }));
      const analyzedIds = new Set(pending.map((message) => message.id));
      const nextActive = activeMessages.filter(
        (message) => !analyzedIds.has(message.id) && message.body.trim(),
      );
      const finalActive = nextActive.length ? nextActive : [createDraftMessage()];
      const nextPrevious = [...analyzedDrafts, ...previousMessages];

      writeJson(STORAGE_KEYS.currentAnalysis, combined);
      writeJson(STORAGE_KEYS.savedContacts, combined.contacts);
      writeJson(STORAGE_KEYS.importDraft, "");
      writeJson(STORAGE_KEYS.importDraftMessages, finalActive);
      writeJson(STORAGE_KEYS.previousImportMessages, nextPrevious);
      setActiveMessages(finalActive);
      setPreviousMessages(nextPrevious);
      toast.success(formatAnalyzerLabel(combined.analysisDiagnostics));
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
        description="Add each inbound message as its own item, optionally attach sender/source context, then analyze the queue."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Messages to analyze</CardTitle>
                  <CardDescription>
                    Paste one message per card. Sender, source, and notes are
                    optional.
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={addMessage} disabled={isSubmitting}>
                  <Plus className="size-4" />
                  Add message
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubmitting ? (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                  <Progress value={progressValue}>
                    <ProgressLabel>Analyzing messages</ProgressLabel>
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                      {completedCount}/{analysisTotal}
                    </span>
                  </Progress>
                </div>
              ) : null}

              <div
                className={cn(
                  "space-y-3 rounded-xl border border-dashed border-transparent",
                  draggedMessage?.list === "previous" &&
                    "border-primary/40 bg-primary/5 p-2",
                )}
                onDragOver={(event) => {
                  if (draggedMessage?.list === "previous") {
                    event.preventDefault();
                  }
                }}
                onDrop={handleDropToActive}
              >
                {activeMessages.map((message, index) => (
                  <MessageDraftCard
                    key={message.id}
                    message={message}
                    index={index}
                    list="active"
                    disabled={isSubmitting}
                    onDragStart={setDraggedMessage}
                    onDragEnd={() => setDraggedMessage(null)}
                    onChange={updateMessage}
                    onRemove={(id) => removeMessage({ id, list: "active" })}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
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

          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground transition-colors",
              draggedMessage && "border-destructive/60 bg-destructive/10 text-destructive",
            )}
            onDragOver={(event) => {
              if (draggedMessage) event.preventDefault();
            }}
            onDrop={handleDropToTrash}
          >
            <Trash2 className="size-4" />
            Drag messages here to delete
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Previous messages</h2>
                <p className="text-xs text-muted-foreground">
                  Already analyzed messages stay editable. Drag one back up to
                  analyze it again.
                </p>
              </div>
              <span className="rounded-full border border-border/80 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {previousMessages.length}
              </span>
            </div>

            {previousMessages.length > 0 ? (
              <div className="space-y-3">
                {previousMessages.map((message, index) => (
                  <MessageDraftCard
                    key={message.id}
                    message={message}
                    index={index}
                    list="previous"
                    disabled={isSubmitting}
                    onDragStart={setDraggedMessage}
                    onDragEnd={() => setDraggedMessage(null)}
                    onChange={updateMessage}
                    onRemove={(id) => removeMessage({ id, list: "previous" })}
                    onMoveToActive={movePreviousToActive}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                Analyzed messages will appear here after import.
              </div>
            )}
          </section>
        </div>

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

function MessageDraftCard({
  message,
  index,
  list,
  disabled,
  onDragStart,
  onDragEnd,
  onChange,
  onRemove,
  onMoveToActive,
}: {
  message: ImportMessageDraft;
  index: number;
  list: MessageList;
  disabled: boolean;
  onDragStart: (message: DraggedMessage) => void;
  onDragEnd: () => void;
  onChange: (
    list: MessageList,
    messageId: string,
    patch: Partial<ImportMessageDraft>,
  ) => void;
  onRemove: (messageId: string) => void;
  onMoveToActive?: (messageId: string) => void;
}) {
  const analyzed = message.status === "analyzed";
  const analyzing = message.status === "analyzing";
  const failed = message.status === "failed";

  return (
    <div
      draggable={!disabled}
      onDragStart={() => onDragStart({ id: message.id, list })}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-xs transition-colors",
        analyzed && "border-emerald-200 bg-emerald-50/70",
        analyzing && "border-primary/40 bg-primary/5",
        failed && "border-destructive/40 bg-destructive/5",
        list === "previous" && "border-emerald-200 bg-emerald-50/50",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {list === "active" ? "Message" : "Previous"} {index + 1}
          </span>
          {analyzing ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Loader2 className="size-3 animate-spin" />
              Analyzing
            </span>
          ) : null}
          {analyzed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              <CheckCircle2 className="size-3" />
              Analyzed
            </span>
          ) : null}
          {failed ? (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
              Needs retry
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {list === "previous" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMoveToActive?.(message.id)}
              disabled={disabled}
              title="Analyze again"
            >
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(message.id)}
            disabled={disabled}
            title="Delete message"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          <Textarea
            value={message.body}
            onChange={(event) =>
              onChange(list, message.id, { body: event.target.value })
            }
            disabled={disabled}
            className="min-h-[150px] resize-y bg-background text-sm"
            placeholder="Paste the message here..."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Sender
            </label>
            <Input
              value={message.sender}
              onChange={(event) =>
                onChange(list, message.id, { sender: event.target.value })
              }
              disabled={disabled}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Source
            </label>
            <Input
              value={message.source}
              onChange={(event) =>
                onChange(list, message.id, { source: event.target.value })
              }
              disabled={disabled}
              placeholder="Email, Slack..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Input
              value={message.notes}
              onChange={(event) =>
                onChange(list, message.id, { notes: event.target.value })
              }
              disabled={disabled}
              placeholder="Optional"
            />
          </div>
        </div>
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
