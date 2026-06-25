"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Clipboard,
  ContactRound,
  GripVertical,
  KanbanSquare,
  MailCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { readJson, writeJson } from "@/lib/browserStorage";
import { logEvent } from "@/lib/logEvent";
import { makeClientId } from "@/lib/normalize";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import {
  compareMessagesByDeadlineUrgency,
  getTimingBadgeClass,
  getTimingCardClass,
  getTimingDotClass,
  getTimingLabel,
  getMessageTimingLabel,
  migrateAnalysisResult,
  REPLY_TIMINGS,
  syncMessageTiming,
  TIMING_COLUMNS,
  urgencyToPriority,
} from "@/lib/replyTiming";
import { cn } from "@/lib/utils";
import type {
  AnalysisResult,
  AnalyzedMessage,
  ExtractedContact,
  FollowUp,
  Urgency,
} from "@/types";

function buildAnalysisFromMessages(
  analysis: AnalysisResult,
  nextMessages: AnalyzedMessage[],
  syncTiming: boolean,
): AnalysisResult {
  const messages = syncTiming
    ? nextMessages.map(syncMessageTiming)
    : nextMessages;
  const categoryCounts = messages.reduce<Record<string, number>>(
    (counts, message) => {
      counts[message.category] = (counts[message.category] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    ...analysis,
    messages,
    categoryCounts,
    messageCount: messages.length,
    sourceTypes: Array.from(
      new Set(messages.map((message) => message.source).filter(Boolean)),
    ),
  };
}

function filterDeletedMessages(analysis: AnalysisResult): AnalysisResult {
  const deletedIds = new Set(
    readJson<string[]>(STORAGE_KEYS.boardDeletedMessageIds, []),
  );
  if (deletedIds.size === 0) return analysis;

  return buildAnalysisFromMessages(
    analysis,
    analysis.messages.filter((message) => !deletedIds.has(message.id)),
    false,
  );
}

export default function BoardPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<AnalyzedMessage | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragOverUrgency, setDragOverUrgency] = useState<Urgency | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = readJson<AnalysisResult | null>(
        STORAGE_KEYS.currentAnalysis,
        null,
      );
      if (stored) {
        setAnalysis(filterDeletedMessages(migrateAnalysisResult(stored)));
      }
    });
  }, []);

  useEffect(() => {
    void logEvent("viewed_board");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadServerBoard() {
      const response = await fetch("/api/board");
      if (!response.ok) return;

      const serverAnalysis = migrateAnalysisResult(
        (await response.json()) as AnalysisResult,
      );
      const visibleServerAnalysis = filterDeletedMessages(serverAnalysis);

      if (!active || visibleServerAnalysis.messageCount === 0) return;

      setAnalysis((current) => {
        if (!current) return visibleServerAnalysis;

        const existingIds = new Set(
          current.messages.map((message) => message.id),
        );
        const mergedMessages = [
          ...visibleServerAnalysis.messages.filter(
            (message) => !existingIds.has(message.id),
          ),
          ...current.messages,
        ];

        return buildAnalysisFromMessages(current, mergedMessages, false);
      });
    }

    void loadServerBoard();

    return () => {
      active = false;
    };
  }, []);

  const messages = useMemo(() => analysis?.messages ?? [], [analysis]);
  const sourceFilters = useMemo(() => {
    const sources = Array.from(
      new Set(messages.map((message) => message.source).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return ["all", ...sources];
  }, [messages]);
  const visibleMessages = useMemo(
    () =>
      sourceFilter === "all"
        ? messages
        : messages.filter((message) => message.source === sourceFilter),
    [messages, sourceFilter],
  );
  const grouped = useMemo(
    () =>
      TIMING_COLUMNS.map((column) => ({
        ...column,
        messages: visibleMessages
          .filter((message) => column.urgencies.includes(message.urgency))
          .sort(compareMessagesByDeadlineUrgency),
      })),
    [visibleMessages],
  );

  function persist(nextMessages: AnalyzedMessage[], syncTiming = true) {
    if (!analysis) return;
    const next = buildAnalysisFromMessages(analysis, nextMessages, syncTiming);
    setAnalysis(next);
    writeJson(STORAGE_KEYS.currentAnalysis, next);
  }

  function updateMessage(messageId: string, patch: Partial<AnalyzedMessage>) {
    const nextMessage = messages
      .filter((message) => message.id === messageId)
      .map((message) => syncMessageTiming({ ...message, ...patch }))[0];

    if (!nextMessage) return;

    persist(
      messages.map((message) =>
        message.id === messageId ? nextMessage : message,
      ),
    );
    setSelected((current) =>
      current?.id === messageId ? nextMessage : current,
    );
  }

  function changeMessageTiming(
    messageId: string,
    urgency: Urgency,
    patch: Partial<AnalyzedMessage> = {},
  ) {
    const nextMessage = messages
      .filter((message) => message.id === messageId)
      .map((message) => ({
        ...message,
        ...patch,
        urgency,
        priority: urgencyToPriority(urgency),
        deadline: getTimingLabel(urgency),
      }))[0];

    if (!nextMessage) return;

    persist(
      messages.map((message) =>
        message.id === messageId ? nextMessage : message,
      ),
      false,
    );
    setSelected((current) =>
      current?.id === messageId ? nextMessage : current,
    );
  }

  function deleteMessage(messageId: string) {
    const deletedIds = readJson<string[]>(
      STORAGE_KEYS.boardDeletedMessageIds,
      [],
    );
    if (!deletedIds.includes(messageId)) {
      writeJson(STORAGE_KEYS.boardDeletedMessageIds, [
        ...deletedIds,
        messageId,
      ]);
    }

    persist(
      messages.filter((message) => message.id !== messageId),
      false,
    );
    setSelected((current) => (current?.id === messageId ? null : current));
    toast.success("Message deleted");
    void logEvent("deleted_message", { message_id: messageId });
  }

  function handleMessageDragStart(
    event: DragEvent<HTMLElement>,
    message: AnalyzedMessage,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", message.id);
    setDraggedMessageId(message.id);
  }

  function handleColumnDragOver(
    event: DragEvent<HTMLElement>,
    urgency: Urgency,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverUrgency(urgency);
  }

  function handleColumnDragLeave(event: DragEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;
    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      setDragOverUrgency(null);
    }
  }

  function handleColumnDrop(event: DragEvent<HTMLElement>, urgency: Urgency) {
    event.preventDefault();
    const messageId =
      event.dataTransfer.getData("text/plain") || draggedMessageId;
    setDraggedMessageId(null);
    setDragOverUrgency(null);

    if (!messageId) return;
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message || message.urgency === urgency) return;

    changeMessageTiming(messageId, urgency);
    toast.success(`Moved to ${getTimingLabel(urgency)}`);
    void logEvent("changed_priority", {
      message_id: messageId,
      priority: urgencyToPriority(urgency),
    });
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLElement>,
    message: AnalyzedMessage,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openMessage(message);
  }

  async function copyReply(message: AnalyzedMessage) {
    await navigator.clipboard.writeText(message.suggestedReply);
    toast.success("Suggested reply copied");
    void logEvent("copied_reply", {
      message_id: message.id,
      category: message.category,
      priority: message.priority,
    });
  }

  async function syncContact(contact: ExtractedContact) {
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    }).catch(() => null);
  }

  async function syncFollowUp(followup: FollowUp) {
    await fetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followup }),
    }).catch(() => null);
  }

  function openMessage(message: AnalyzedMessage) {
    setSelected(message);
    void logEvent("opened_message", {
      message_id: message.id,
      category: message.category,
      priority: message.priority,
    });
  }

  function saveContact(message: AnalyzedMessage) {
    const contacts = readJson<ExtractedContact[]>(
      STORAGE_KEYS.savedContacts,
      [],
    );
    const exists = contacts.some((contact) => contact.name === message.senderName);
    const newContact: ExtractedContact = {
      id: makeClientId("contact"),
      name: message.senderName,
      organization: message.senderOrganization,
      role: message.senderRole,
      source: message.source,
      tags: message.contactTags,
      lastInteractionSummary: message.summary,
      priority: message.priority,
      nextStep: message.suggestedAction,
      lastInteractionAt: new Date().toISOString(),
    };
    const nextContacts = exists ? contacts : [...contacts, newContact];

    writeJson(STORAGE_KEYS.savedContacts, nextContacts);
    if (!exists) void syncContact(newContact);
    toast.success(exists ? "Contact already saved" : "Contact saved");
    void logEvent("saved_contact", {
      message_id: message.id,
      priority: message.priority,
      category: message.category,
    });
  }

  function createFollowUp(message: AnalyzedMessage) {
    const followups = readJson<FollowUp[]>(STORAGE_KEYS.followups, []);
    const followUp: FollowUp = {
      id: makeClientId("followup"),
      messageId: message.id,
      person: message.senderName,
      followUpDate:
        message.followUpDate ||
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      reason: message.suggestedAction,
      suggestedMessage: message.suggestedReply,
      status: "upcoming",
    };

    writeJson(STORAGE_KEYS.followups, [...followups, followUp]);
    void syncFollowUp(followUp);
    changeMessageTiming(message.id, "this_month", { status: "follow_up" });
    toast.success("Follow-up created");
    void logEvent("created_followup", {
      message_id: message.id,
      priority: message.priority,
      category: message.category,
    });
  }

  if (!analysis || analysis.messageCount === 0) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="Your board is empty"
        description="Import messages or connect an inbox and Introbase will rank everything by reply urgency."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/app/import" className={buttonVariants()}>
              <Plus className="size-4" />
              Import messages
            </Link>
            <Link
              href="/app/integrations"
              className={buttonVariants({ variant: "outline" })}
            >
              Connect an inbox
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board"
        description={`${analysis.messageCount} ${
          analysis.messageCount === 1 ? "message" : "messages"
        } ranked by reply urgency.`}
        actions={
          <>
            {sourceFilters.length > 2 ? (
              <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-1">
                {sourceFilters.map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSourceFilter(source)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                      sourceFilter === source &&
                        "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {source === "all" ? "All sources" : source}
                  </button>
                ))}
              </div>
            ) : null}
            <Link href="/app/import" className={buttonVariants()}>
              <Plus className="size-4" />
              Import messages
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {grouped.map((column) => {
          const columnUrgency = column.urgencies[0];

          return (
            <section
              key={column.title}
              onDragOver={(event) => handleColumnDragOver(event, columnUrgency)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(event) => handleColumnDrop(event, columnUrgency)}
              className={cn(
                "flex flex-col rounded-xl border border-border/70 bg-muted/40 transition-shadow",
                dragOverUrgency === columnUrgency &&
                  "ring-2 ring-ring/45 ring-offset-2",
              )}
            >
              <header className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      getTimingDotClass(columnUrgency),
                    )}
                  />
                  <h2 className="text-sm font-semibold">{column.title}</h2>
                </div>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border/80">
                  {column.messages.length}
                </span>
              </header>
              <div className="flex flex-col gap-2 px-2 pb-2">
                {column.messages.map((message) => (
                  <article
                    key={message.id}
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label={`Open message from ${message.senderName}`}
                    onClick={() => openMessage(message)}
                    onKeyDown={(event) => handleCardKeyDown(event, message)}
                    onDragStart={(event) => handleMessageDragStart(event, message)}
                    onDragEnd={() => {
                      setDraggedMessageId(null);
                      setDragOverUrgency(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-lg border border-border/70 bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing",
                      getTimingCardClass(message.urgency),
                      draggedMessageId === message.id && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-2">
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {message.senderName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[message.senderRole, message.senderOrganization]
                              .filter(Boolean)
                              .join(" · ") || message.source}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start gap-1">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            getTimingBadgeClass(message.urgency),
                          )}
                        >
                          {getMessageTimingLabel(message)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete message from ${message.senderName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteMessage(message.id);
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-foreground/80">
                      {message.summary}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {message.category}
                      </span>
                      {message.source ? (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {message.source}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
                {column.messages.length === 0 ? (
                  <div
                    className={cn(
                      "rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-xs text-muted-foreground transition-colors",
                      dragOverUrgency === columnUrgency &&
                        "border-ring bg-card text-foreground",
                    )}
                  >
                    {dragOverUrgency === columnUrgency
                      ? "Drop here"
                      : "Nothing here"}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        {selected ? (
          <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto p-5 sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    getTimingBadgeClass(selected.urgency),
                  )}
                >
                  {getMessageTimingLabel(selected)}
                </span>
                <Badge variant="outline" className="capitalize">
                  {selected.category}
                </Badge>
                {selected.source ? (
                  <Badge variant="outline">{selected.source}</Badge>
                ) : null}
              </div>
              <DialogTitle className="mt-1 text-lg leading-6">
                {selected.senderName}
              </DialogTitle>
              {selected.senderRole || selected.senderOrganization ? (
                <DialogDescription>
                  {[selected.senderRole, selected.senderOrganization]
                    .filter(Boolean)
                    .join(" · ")}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Why this matters
                </h3>
                <p className="mt-2 text-sm leading-6">{selected.whyItMatters}</p>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested action
                </h3>
                <p className="mt-2 text-sm leading-6">
                  {selected.suggestedAction}
                </p>
              </section>
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested reply
                  </h3>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => void copyReply(selected)}
                  >
                    <Clipboard className="size-3.5" />
                    Copy
                  </Button>
                </div>
                <div className="mt-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-sm leading-6">
                  {selected.suggestedReply}
                </div>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Original message
                </h3>
                <div className="mt-2 whitespace-pre-wrap rounded-lg border border-border/80 bg-card p-3 text-sm leading-6 text-muted-foreground">
                  {selected.originalText}
                </div>
              </section>
              <div className="space-y-2 border-t border-border/70 pt-5">
                <Button className="w-full" onClick={() => void copyReply(selected)}>
                  <Clipboard className="size-4" />
                  Copy suggested reply
                </Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateMessage(selected.id, { status: "replied" });
                      toast.success("Marked as replied");
                    }}
                  >
                    <MailCheck className="size-4" />
                    Mark replied
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => createFollowUp(selected)}
                  >
                    <CheckCircle2 className="size-4" />
                    Follow up later
                  </Button>
                  <Button variant="outline" onClick={() => saveContact(selected)}>
                    <ContactRound className="size-4" />
                    Save contact
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      changeMessageTiming(selected.id, "later", {
                        status: "ignored",
                      });
                      void logEvent("changed_priority", {
                        message_id: selected.id,
                        priority: "low",
                      });
                    }}
                  >
                    <Archive className="size-4" />
                    Move to later
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => deleteMessage(selected.id)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete message
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full",
                    )}
                  >
                    Change timing
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {REPLY_TIMINGS.map((urgency) => (
                      <DropdownMenuItem
                        key={urgency}
                        onClick={() => {
                          changeMessageTiming(selected.id, urgency);
                          void logEvent("changed_priority", {
                            message_id: selected.id,
                            priority: urgencyToPriority(urgency),
                          });
                        }}
                      >
                        {getTimingLabel(urgency)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
