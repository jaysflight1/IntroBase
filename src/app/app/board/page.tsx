"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clipboard,
  ContactRound,
  GripVertical,
  KanbanSquare,
  MailCheck,
  MousePointerClick,
  Move,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";
import { readJson, writeJson } from "@/lib/browserStorage";
import { logEvent } from "@/lib/logEvent";
import { makeClientId } from "@/lib/normalize";
import { sanitizeNextPath } from "@/lib/auth/redirects";
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
  urgencyForDeadlineText,
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

type DropPosition = "before" | "after";

interface BoardExperienceProps {
  demo?: boolean;
}

interface DragTarget {
  messageId: string;
  position: DropPosition;
}

function getBoardStorageKeys(demo: boolean) {
  return {
    currentAnalysis: demo
      ? STORAGE_KEYS.demoCurrentAnalysis
      : STORAGE_KEYS.currentAnalysis,
    boardDeletedMessageIds: demo
      ? STORAGE_KEYS.demoBoardDeletedMessageIds
      : STORAGE_KEYS.boardDeletedMessageIds,
    boardMessageOrder: demo
      ? STORAGE_KEYS.demoBoardMessageOrder
      : STORAGE_KEYS.boardMessageOrder,
    savedContacts: demo ? STORAGE_KEYS.demoSavedContacts : STORAGE_KEYS.savedContacts,
    followups: demo ? STORAGE_KEYS.demoFollowups : STORAGE_KEYS.followups,
  };
}

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

function getColumnIndex(urgency: Urgency): number {
  const index = TIMING_COLUMNS.findIndex((column) =>
    column.urgencies.includes(urgency),
  );
  return index >= 0 ? index : TIMING_COLUMNS.length;
}

function getOrderedMessages(
  nextMessages: AnalyzedMessage[],
  boardOrder: string[],
): AnalyzedMessage[] {
  const orderIndex = new Map(boardOrder.map((id, index) => [id, index]));
  const hasManualOrder = boardOrder.length > 0;

  return [...nextMessages].sort((a, b) => {
    if (hasManualOrder) {
      const aIndex = orderIndex.get(a.id);
      const bIndex = orderIndex.get(b.id);

      if (aIndex !== undefined || bIndex !== undefined) {
        if (aIndex === undefined) return 1;
        if (bIndex === undefined) return -1;
        if (aIndex !== bIndex) return aIndex - bIndex;
      }
    }

    const columnDifference = getColumnIndex(a.urgency) - getColumnIndex(b.urgency);
    if (columnDifference !== 0) return columnDifference;

    return compareMessagesByDeadlineUrgency(a, b);
  });
}

function getColumnInsertIndex(
  orderedMessages: AnalyzedMessage[],
  urgency: Urgency,
): number {
  const targetColumnIndex = getColumnIndex(urgency);
  let insertIndex = orderedMessages.length;

  for (let index = 0; index < orderedMessages.length; index += 1) {
    const messageColumnIndex = getColumnIndex(orderedMessages[index].urgency);

    if (messageColumnIndex === targetColumnIndex) {
      insertIndex = index + 1;
    } else if (messageColumnIndex > targetColumnIndex) {
      return insertIndex === orderedMessages.length ? index : insertIndex;
    }
  }

  return insertIndex;
}

function getDropPosition(event: DragEvent<HTMLElement>): DropPosition {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

function filterDeletedMessages(
  analysis: AnalysisResult,
  deletedMessageIdsKey: string = STORAGE_KEYS.boardDeletedMessageIds,
): AnalysisResult {
  const deletedIds = new Set(
    readJson<string[]>(deletedMessageIdsKey, []),
  );
  if (deletedIds.size === 0) return analysis;

  return buildAnalysisFromMessages(
    analysis,
    analysis.messages.filter((message) => !deletedIds.has(message.id)),
    false,
  );
}

export function BoardExperience(props: BoardExperienceProps) {
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 text-sm text-muted-foreground">
          Loading board...
        </div>
      }
    >
      <BoardView {...props} />
    </Suspense>
  );
}

function BoardView({ demo = false }: BoardExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKeys = useMemo(() => getBoardStorageKeys(demo), [demo]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<AnalyzedMessage | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [boardOrder, setBoardOrder] = useState<string[]>([]);
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragOverUrgency, setDragOverUrgency] = useState<Urgency | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [tutorialStep, setTutorialStep] = useState<number | null>(
    demo ? 0 : null,
  );
  const [showDemoFeedback, setShowDemoFeedback] = useState(false);
  const demoReturnTo = useMemo(() => {
    if (!demo) return "";

    const value = searchParams.get("returnTo");
    if (!value) return "";

    const sanitized = sanitizeNextPath(value);
    return sanitized.startsWith("/app") ? sanitized : "";
  }, [demo, searchParams]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = readJson<AnalysisResult | null>(
        storageKeys.currentAnalysis,
        null,
      );
      if (stored) {
        setAnalysis(
          filterDeletedMessages(
            migrateAnalysisResult(stored),
            storageKeys.boardDeletedMessageIds,
          ),
        );
      }
      setBoardOrder(readJson<string[]>(storageKeys.boardMessageOrder, []));
    });
  }, [storageKeys]);

  useEffect(() => {
    void logEvent("viewed_board");
  }, []);

  useEffect(() => {
    if (demo) return;

    let active = true;

    async function loadServerBoard() {
      const response = await fetch("/api/board");
      if (!response.ok) return;

      const serverAnalysis = migrateAnalysisResult(
        (await response.json()) as AnalysisResult,
      );
      const visibleServerAnalysis = filterDeletedMessages(
        serverAnalysis,
        storageKeys.boardDeletedMessageIds,
      );

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
  }, [demo, storageKeys]);

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
    () => {
      const orderedMessages = getOrderedMessages(visibleMessages, boardOrder);

      return TIMING_COLUMNS.map((column) => ({
        ...column,
        messages: orderedMessages.filter((message) =>
          column.urgencies.includes(message.urgency),
        ),
      }));
    },
    [boardOrder, visibleMessages],
  );
  const firstVisibleMessageId = useMemo(
    () => grouped.flatMap((column) => column.messages).at(0)?.id,
    [grouped],
  );
  const showTutorial = demo && tutorialStep !== null;

  function finishDemoFeedback() {
    setShowDemoFeedback(false);
    setTutorialStep(null);

    if (demoReturnTo) {
      router.push(demoReturnTo);
    }
  }

  function persist(
    nextMessages: AnalyzedMessage[],
    syncTiming = true,
    nextBoardOrder?: string[],
  ) {
    if (!analysis) return;
    const next = buildAnalysisFromMessages(analysis, nextMessages, syncTiming);
    setAnalysis(next);
    writeJson(storageKeys.currentAnalysis, next);

    if (nextBoardOrder) {
      setBoardOrder(nextBoardOrder);
      writeJson(storageKeys.boardMessageOrder, nextBoardOrder);
    }
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
    if (selected?.id === messageId) {
      setDeadlineDraft(nextMessage.deadline || getTimingLabel(nextMessage.urgency));
      if (nextMessage.suggestedReply !== selected.suggestedReply) {
        setReplyDraft(nextMessage.suggestedReply);
      }
    }
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

  function updateMessageWithoutTimingSync(
    messageId: string,
    patch: Partial<AnalyzedMessage>,
  ) {
    const nextMessage = messages
      .filter((message) => message.id === messageId)
      .map((message) => ({ ...message, ...patch }))[0];

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

  function saveDeadline(messageId: string, value: string) {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message) return;

    const deadline = value.trim() || getTimingLabel(message.urgency);
    const urgency = urgencyForDeadlineText(deadline) ?? message.urgency;

    updateMessageWithoutTimingSync(messageId, {
      deadline,
      urgency,
      priority: urgencyToPriority(urgency),
    });
    if (deadline !== message.deadline) {
      void logEvent("edited_deadline", {
        message_id: messageId,
        urgency,
      });
    }
    setDeadlineDraft(deadline);
  }

  function saveSuggestedReply(messageId: string, value: string) {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message) return;

    const suggestedReply = value.trim();
    if (!suggestedReply) return;

    updateMessageWithoutTimingSync(messageId, { suggestedReply });
    if (suggestedReply !== message.suggestedReply) {
      void logEvent("edited_suggested_reply", {
        message_id: messageId,
        character_count: suggestedReply.length,
      });
    }
    setReplyDraft(suggestedReply);
  }

  function moveMessageOnBoard(
    messageId: string,
    targetUrgency: Urgency,
    targetMessageId?: string,
    position: DropPosition = "after",
  ) {
    const currentMessages = getOrderedMessages(messages, boardOrder);
    const currentMessage = currentMessages.find(
      (message) => message.id === messageId,
    );
    if (!currentMessage) return;

    const nextMessage =
      currentMessage.urgency === targetUrgency
        ? currentMessage
        : {
            ...currentMessage,
            urgency: targetUrgency,
            priority: urgencyToPriority(targetUrgency),
            deadline: getTimingLabel(targetUrgency),
          };
    const withoutDragged = currentMessages.filter(
      (message) => message.id !== messageId,
    );
    let insertIndex = getColumnInsertIndex(withoutDragged, targetUrgency);

    if (targetMessageId && targetMessageId !== messageId) {
      const targetIndex = withoutDragged.findIndex(
        (message) => message.id === targetMessageId,
      );

      if (targetIndex >= 0) {
        insertIndex = targetIndex + (position === "after" ? 1 : 0);
      }
    }

    const nextMessages = [
      ...withoutDragged.slice(0, insertIndex),
      nextMessage,
      ...withoutDragged.slice(insertIndex),
    ];
    const nextBoardOrder = nextMessages.map((message) => message.id);

    persist(nextMessages, false, nextBoardOrder);
    setSelected((current) =>
      current?.id === messageId ? nextMessage : current,
    );

    const changedColumn = currentMessage.urgency !== targetUrgency;
    toast.success(
      changedColumn ? `Moved to ${getTimingLabel(targetUrgency)}` : "Reordered",
    );
    if (changedColumn) {
      void logEvent("changed_priority", {
        message_id: messageId,
        priority: urgencyToPriority(targetUrgency),
      });
    } else {
      void logEvent("reordered_message", { message_id: messageId });
    }
    if (demo && tutorialStep === 2) {
      setTutorialStep(3);
    }
  }

  function deleteMessage(messageId: string) {
    const deletedIds = readJson<string[]>(
      storageKeys.boardDeletedMessageIds,
      [],
    );
    if (!deletedIds.includes(messageId)) {
      writeJson(storageKeys.boardDeletedMessageIds, [
        ...deletedIds,
        messageId,
      ]);
    }

    persist(
      messages.filter((message) => message.id !== messageId),
      false,
      boardOrder.filter((id) => id !== messageId),
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

  function handleMessageDragOver(
    event: DragEvent<HTMLElement>,
    message: AnalyzedMessage,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverUrgency(message.urgency);
    setDragTarget({
      messageId: message.id,
      position: getDropPosition(event),
    });
  }

  function handleMessageDrop(
    event: DragEvent<HTMLElement>,
    message: AnalyzedMessage,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const messageId =
      event.dataTransfer.getData("text/plain") || draggedMessageId;
    const position = getDropPosition(event);
    setDraggedMessageId(null);
    setDragOverUrgency(null);
    setDragTarget(null);

    if (!messageId || messageId === message.id) return;
    moveMessageOnBoard(messageId, message.urgency, message.id, position);
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
    setDragTarget(null);

    if (!messageId) return;
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message) return;

    moveMessageOnBoard(messageId, urgency);
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLElement>,
    message: AnalyzedMessage,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openMessage(message);
  }

  function closeSelectedMessage() {
    if (selected) {
      const deadline = deadlineDraft.trim() || getTimingLabel(selected.urgency);
      const urgency = urgencyForDeadlineText(deadline) ?? selected.urgency;
      const suggestedReply = replyDraft.trim() || selected.suggestedReply;

      updateMessageWithoutTimingSync(selected.id, {
        deadline,
        urgency,
        priority: urgencyToPriority(urgency),
        suggestedReply,
      });
      if (deadline !== selected.deadline) {
        void logEvent("edited_deadline", {
          message_id: selected.id,
          urgency,
        });
      }
      if (suggestedReply !== selected.suggestedReply) {
        void logEvent("edited_suggested_reply", {
          message_id: selected.id,
          character_count: suggestedReply.length,
        });
      }
    }
    setSelected(null);
  }

  async function copyReply(
    message: AnalyzedMessage,
    reply = message.suggestedReply,
  ) {
    const suggestedReply = reply.trim() || message.suggestedReply;
    if (suggestedReply !== message.suggestedReply) {
      saveSuggestedReply(message.id, suggestedReply);
    }

    await navigator.clipboard.writeText(suggestedReply);
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
    setDeadlineDraft(message.deadline || getTimingLabel(message.urgency));
    setReplyDraft(message.suggestedReply);
    setSelected(message);
    if (demo && tutorialStep === 1) {
      setTutorialStep(2);
    }
    void logEvent("opened_message", {
      message_id: message.id,
      category: message.category,
      priority: message.priority,
    });
  }

  function saveContact(message: AnalyzedMessage) {
    const contacts = readJson<ExtractedContact[]>(
      storageKeys.savedContacts,
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

    writeJson(storageKeys.savedContacts, nextContacts);
    if (!exists && !demo) void syncContact(newContact);
    toast.success(exists ? "Contact already saved" : "Contact saved");
    void logEvent("saved_contact", {
      message_id: message.id,
      priority: message.priority,
      category: message.category,
    });
  }

  function createFollowUp(message: AnalyzedMessage) {
    const followups = readJson<FollowUp[]>(storageKeys.followups, []);
    const suggestedMessage =
      message.id === selected?.id
        ? replyDraft.trim() || message.suggestedReply
        : message.suggestedReply;
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
      suggestedMessage,
      status: "upcoming",
    };

    writeJson(storageKeys.followups, [...followups, followUp]);
    if (!demo) void syncFollowUp(followUp);
    changeMessageTiming(message.id, "this_month", {
      status: "follow_up",
      suggestedReply: suggestedMessage,
    });
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
            <Link href={demo ? "/demo/import" : "/app/import"} className={buttonVariants()}>
              <Plus className="size-4" />
              Import messages
            </Link>
            {demo ? null : (
              <Link
                href="/app/integrations"
                className={buttonVariants({ variant: "outline" })}
              >
                Connect an inbox
              </Link>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {showTutorial ? (
        <DemoBoardTutorial
          step={tutorialStep}
          returnTo={demoReturnTo}
          onNext={() => setTutorialStep((current) => (current ?? 0) + 1)}
          onSkip={() => setTutorialStep(null)}
          onComplete={() => setShowDemoFeedback(true)}
        />
      ) : null}
      {demo ? (
        <DemoFeedbackPrompt
          open={showDemoFeedback}
          onDone={finishDemoFeedback}
        />
      ) : null}

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
            <Link href={demo ? "/demo/import" : "/app/import"} className={buttonVariants()}>
              <Plus className="size-4" />
              Import messages
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                    onDragOver={(event) => handleMessageDragOver(event, message)}
                    onDrop={(event) => handleMessageDrop(event, message)}
                    onDragEnd={() => {
                      setDraggedMessageId(null);
                      setDragOverUrgency(null);
                      setDragTarget(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-lg border border-border/70 bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing",
                      getTimingCardClass(message.urgency),
                      draggedMessageId === message.id && "opacity-60",
                      dragTarget?.messageId === message.id &&
                        dragTarget.position === "before" &&
                        "ring-2 ring-ring/45 ring-offset-2",
                      dragTarget?.messageId === message.id &&
                        dragTarget.position === "after" &&
                        "ring-2 ring-ring/45 ring-offset-2",
                      demo &&
                        tutorialStep === 1 &&
                        message.id === firstVisibleMessageId &&
                        "animate-pulse ring-4 ring-primary/25 ring-offset-2",
                      demo &&
                        tutorialStep === 2 &&
                        message.id === firstVisibleMessageId &&
                        "ring-4 ring-primary/25 ring-offset-2",
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closeSelectedMessage();
        }}
      >
        {selected ? (
          <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto p-5 sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    "flex items-center rounded-full border px-2 py-0.5",
                    getTimingBadgeClass(selected.urgency),
                  )}
                >
                  <span className="sr-only">Deadline</span>
                  <Input
                    value={deadlineDraft}
                    onChange={(event) => setDeadlineDraft(event.target.value)}
                    onBlur={() => saveDeadline(selected.id, deadlineDraft)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    className="h-5 min-w-24 border-0 bg-transparent px-0 py-0 text-[11px] font-medium shadow-none focus-visible:ring-0"
                  />
                </label>
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
                    onClick={() => void copyReply(selected, replyDraft)}
                  >
                    <Clipboard className="size-3.5" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  onBlur={() => saveSuggestedReply(selected.id, replyDraft)}
                  className="mt-2 min-h-36 resize-y rounded-lg border-border/80 bg-muted/40 text-sm leading-6"
                />
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
                <Button
                  className="w-full"
                  onClick={() => void copyReply(selected, replyDraft)}
                >
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

export default function BoardPage() {
  return <BoardExperience />;
}

function DemoBoardTutorial({
  step,
  returnTo,
  onNext,
  onSkip,
  onComplete,
}: {
  step: number;
  returnTo?: string;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const tutorialContent = [
    {
      icon: KanbanSquare,
      title: "This is your board",
      body: "Introbase groups messages by when they need attention. The most urgent items are on the left, and lower-priority items move to the right.",
      action: "Show me",
    },
    {
      icon: MousePointerClick,
      title: "Click a message",
      body: "Open any message to edit its deadline or suggested reply, then close the popup to return to the board.",
      action: "",
    },
    {
      icon: Move,
      title: "Drag a message",
      body: "Drag a card within a column to reorder it, or drop it into another column to change its timing and priority.",
      action: "",
    },
    {
      icon: CheckCircle2,
      title: "You are ready",
      body: "That's the flow: import messages, analyze them, and instantly know exactly what to prioritize.",
      action: returnTo ? "Next" : "Finish",
    },
    ...(returnTo
      ? [
          {
            icon: Clipboard,
            title: "Start your workspace",
            body: "Open your own import page. It starts empty, so you can add the messages you actually want Introbase to analyze.",
            action: "Go to my app",
          },
        ]
      : []),
  ];
  const content = tutorialContent[Math.min(step, tutorialContent.length - 1)];
  const Icon = content.icon;
  const finalStep = step >= tutorialContent.length - 1;

  return (
    <div className="fixed top-4 right-4 z-50 w-[min(calc(100vw-2rem),360px)] rounded-lg border border-border/80 bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{content.title}</p>
            <p className="text-xs text-muted-foreground">
              Step {Math.min(step + 1, tutorialContent.length)} of{" "}
              {tutorialContent.length}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="xs" onClick={onSkip}>
          Skip tutorial
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{content.body}</p>
      {content.action ? (
        <Button
          className="mt-4 w-full"
          size="sm"
          onClick={finalStep ? onComplete : onNext}
        >
          {content.action}
        </Button>
      ) : (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          {step === 1
            ? "Try clicking the highlighted card."
            : "Try dragging the highlighted card."}
        </p>
      )}
    </div>
  );
}

const usefulnessOptions = [
  "Very useful",
  "Somewhat useful",
  "Slightly useful",
  "Not useful",
];

const wouldUseOptions = ["Yes", "Likely", "Maybe", "No"];

const willingnessOptions = [
  "$0",
  "$5/month",
  "$10/month",
  "$20/month",
  "$50/month",
  "$100+/month if it worked well",
];

function DemoFeedbackPrompt({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [usefulnessRating, setUsefulnessRating] = useState("");
  const [wouldUseAgain, setWouldUseAgain] = useState("");
  const [willingnessToPay, setWillingnessToPay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(
    usefulnessRating && wouldUseAgain && willingnessToPay,
  );

  async function submitFeedback() {
    if (!canSubmit) {
      toast.error("Answer each question or skip feedback.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_user_id: getAnonymousUserId(),
          session_id: getSessionId(),
          usefulness_rating: usefulnessRating,
          would_use_again: wouldUseAgain,
          willingness_to_pay: willingnessToPay,
          expanded_version_interest: "Completed demo feedback",
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save feedback");
      }

      toast.success("Thanks for the feedback");
      onDone();
    } catch {
      toast.error("IntroBase could not save feedback. You can still continue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onDone() : null)}>
      <DialogContent
        className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto sm:max-w-5xl"
        showCloseButton={false}
      >
        <button
          type="button"
          onClick={onDone}
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Skip feedback"
        >
          <X className="size-4" />
        </button>
        <DialogHeader>
          <DialogTitle>Quick feedback</DialogTitle>
          <DialogDescription>
            Optional, but helpful while IntroBase is still early.
          </DialogDescription>
        </DialogHeader>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <FeedbackChoiceGroup
            label="How useful are IntroBase's message rankings?"
            options={usefulnessOptions}
            value={usefulnessRating}
            onChange={setUsefulnessRating}
          />
          <FeedbackChoiceGroup
            label="Would you use a more developed version of IntroBase if it connected to your real inboxes/DMs, prioritized messages automatically, drafted replies, and reminded you to follow up?"
            options={wouldUseOptions}
            value={wouldUseAgain}
            onChange={setWouldUseAgain}
          />
          <FeedbackChoiceGroup
            label="If an expanded version connected to your real inboxes/DMs, prioritized messages automatically, drafted replies, and reminded you to follow up, what would you pay per month?"
            options={willingnessOptions}
            value={willingnessToPay}
            onChange={setWillingnessToPay}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onDone} disabled={isSubmitting}>
            Skip feedback
          </Button>
          <Button onClick={submitFeedback} disabled={isSubmitting || !canSubmit}>
            <Send className="size-4" />
            Submit feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold leading-6">{label}</legend>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-lg border border-border/80 bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5",
              value === option && "border-primary bg-primary/10 text-primary",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
