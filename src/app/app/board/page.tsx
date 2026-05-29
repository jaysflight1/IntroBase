"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Clipboard,
  ContactRound,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { readJson, writeJson } from "@/lib/browserStorage";
import { logEvent } from "@/lib/logEvent";
import { makeClientId } from "@/lib/normalize";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";
import type {
  AnalysisResult,
  AnalyzedMessage,
  ExtractedContact,
  FollowUp,
  Priority,
  Urgency,
} from "@/types";

const columns: { title: string; urgencies: Urgency[] }[] = [
  { title: "Reply now", urgencies: ["reply_now"] },
  { title: "This week", urgencies: ["reply_this_week"] },
  { title: "Follow up later", urgencies: ["follow_up_later"] },
  { title: "Low priority", urgencies: ["low_priority", "ignore"] },
];

function priorityTone(priority: Priority) {
  if (priority === "high") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "medium")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default function BoardPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() =>
    readJson<AnalysisResult | null>(STORAGE_KEYS.currentAnalysis, null),
  );
  const [selected, setSelected] = useState<AnalyzedMessage | null>(null);
  const [openedCount, setOpenedCount] = useState(0);

  useEffect(() => {
    void logEvent("viewed_board");
  }, []);

  useEffect(() => {
    if (openedCount >= 2) {
      window.dispatchEvent(new Event("introbase-feedback-ready"));
    }
  }, [openedCount]);

  const messages = useMemo(() => analysis?.messages ?? [], [analysis]);
  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        messages: messages
          .filter((message) => column.urgencies.includes(message.urgency))
          .sort((a, b) => b.priorityScore - a.priorityScore),
      })),
    [messages],
  );

  function persist(nextMessages: AnalyzedMessage[]) {
    if (!analysis) return;
    const next = { ...analysis, messages: nextMessages };
    setAnalysis(next);
    writeJson(STORAGE_KEYS.currentAnalysis, next);
  }

  function updateMessage(messageId: string, patch: Partial<AnalyzedMessage>) {
    persist(
      messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    );
    setSelected((current) =>
      current?.id === messageId ? { ...current, ...patch } : current,
    );
  }

  async function copyReply(message: AnalyzedMessage) {
    await navigator.clipboard.writeText(message.suggestedReply);
    toast.success("Suggested reply copied");
    void logEvent("copied_reply", {
      message_id: message.id,
      category: message.category,
      priority: message.priority,
    });
    window.dispatchEvent(new Event("introbase-feedback-ready"));
  }

  function openMessage(message: AnalyzedMessage) {
    setSelected(message);
    setOpenedCount((count) => count + 1);
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
    const nextContacts = exists
      ? contacts
      : [
          ...contacts,
          {
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
          },
        ];

    writeJson(STORAGE_KEYS.savedContacts, nextContacts);
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
    updateMessage(message.id, {
      status: "follow_up",
      urgency: "follow_up_later",
    });
    toast.success("Follow-up created");
    void logEvent("created_followup", {
      message_id: message.id,
      priority: message.priority,
      category: message.category,
    });
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No analysis yet</CardTitle>
          <CardDescription>
            Paste messages or use the sample inbox to create your priority
            board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/import" className={buttonVariants()}>
            Go to import
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {analysis.messageCount} messages analyzed
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Priority board
          </h1>
        </div>
        <Link
          href="/app/import"
          className={buttonVariants({ variant: "outline" })}
        >
          Analyze another batch
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {grouped.map((column) => (
          <section key={column.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{column.title}</h2>
              <Badge variant="outline">{column.messages.length}</Badge>
            </div>
            <div className="space-y-3">
              {column.messages.map((message) => (
                <Card
                  key={message.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => openMessage(message)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {message.senderName}
                        </CardTitle>
                        <CardDescription>{message.source}</CardDescription>
                      </div>
                      <Badge className={priorityTone(message.priority)}>
                        {message.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{message.category}</Badge>
                      <Badge variant="outline">{message.priorityScore}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-6">{message.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {message.suggestedAction}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {column.messages.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
                  No messages in this lane.
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        {selected ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>{selected.senderName}</SheetTitle>
              <SheetDescription>
                {selected.source} · {selected.category} · {selected.priority}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold">Why this matters</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selected.whyItMatters}
                </p>
              </section>
              <section>
                <h3 className="text-sm font-semibold">Suggested action</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selected.suggestedAction}
                </p>
              </section>
              <section>
                <h3 className="text-sm font-semibold">Suggested reply</h3>
                <div className="mt-2 rounded-md border bg-zinc-50 p-3 text-sm leading-6">
                  {selected.suggestedReply}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-semibold">Original message</h3>
                <div className="mt-2 whitespace-pre-wrap rounded-md border bg-white p-3 text-sm leading-6">
                  {selected.originalText}
                </div>
              </section>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => void copyReply(selected)}>
                  <Clipboard className="size-4" />
                  Copy reply
                </Button>
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
                <Button variant="outline" onClick={() => createFollowUp(selected)}>
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
                    updateMessage(selected.id, {
                      priority: "low",
                      urgency: "low_priority",
                      status: "ignored",
                    });
                    void logEvent("changed_priority", {
                      message_id: selected.id,
                      priority: "low",
                    });
                  }}
                >
                  <Archive className="size-4" />
                  Low priority
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full",
                    )}
                  >
                    Change priority
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(["high", "medium", "low"] as Priority[]).map((priority) => (
                      <DropdownMenuItem
                        key={priority}
                        onClick={() => {
                          updateMessage(selected.id, { priority });
                          void logEvent("changed_priority", {
                            message_id: selected.id,
                            priority,
                          });
                        }}
                      >
                        {priority}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
