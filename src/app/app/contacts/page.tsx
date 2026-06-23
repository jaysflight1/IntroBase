"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, StickyNote, Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  getTimingBadgeClass,
  getTimingLabel,
  priorityToUrgency,
  urgencyToPriority,
} from "@/lib/replyTiming";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { readJson, writeJson } from "@/lib/browserStorage";
import { getFollowUpStatus } from "@/lib/followups";
import { logEvent } from "@/lib/logEvent";
import { makeClientId } from "@/lib/normalize";
import { cn } from "@/lib/utils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { ExtractedContact, FollowUp } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ExtractedContact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = readJson<ExtractedContact[]>(
        STORAGE_KEYS.savedContacts,
        [],
      );
      if (stored.length > 0) setContacts(stored);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      const response = await fetch("/api/contacts");
      if (!response.ok) return;

      const payload = (await response.json()) as {
        contacts?: ExtractedContact[];
      };

      if (!active || !payload.contacts?.length) return;

      setContacts((current) => {
        const existingIds = new Set(current.map((contact) => contact.id));
        const merged = [
          ...payload.contacts!.filter((contact) => !existingIds.has(contact.id)),
          ...current,
        ];
        writeJson(STORAGE_KEYS.savedContacts, merged);
        return merged;
      });
    }

    void loadContacts();

    return () => {
      active = false;
    };
  }, []);

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) => {
        const weights = { high: 3, medium: 2, low: 1 };
        return weights[b.priority] - weights[a.priority];
      }),
    [contacts],
  );

  function persist(nextContacts: ExtractedContact[]) {
    setContacts(nextContacts);
    writeJson(STORAGE_KEYS.savedContacts, nextContacts);
  }

  async function syncContact(contact: ExtractedContact) {
    await fetch("/api/contacts", {
      method: "PATCH",
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

  function markImportant(contact: ExtractedContact) {
    const updated = { ...contact, priority: urgencyToPriority("today") };
    persist(
      contacts.map((item) => (item.id === contact.id ? updated : item)),
    );
    void syncContact(updated);
    void logEvent("saved_contact", { contact_id: contact.id, priority: "high" });
  }

  function saveNote(contact: ExtractedContact) {
    const updated = { ...contact, note };
    persist(contacts.map((item) => (item.id === contact.id ? updated : item)));
    void syncContact(updated);
    setEditingId(null);
    setNote("");
    toast.success("Note saved");
  }

  function createFollowUp(contact: ExtractedContact) {
    const followups = readJson<FollowUp[]>(STORAGE_KEYS.followups, []);
    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const followUp: FollowUp = {
      id: makeClientId("followup"),
      contactId: contact.id,
      person: contact.name,
      followUpDate: date,
      reason: contact.nextStep,
      suggestedMessage: `Hi ${contact.name.split(" ")[0]}, following up on this. ${contact.nextStep}`,
      status: getFollowUpStatus(date),
    };

    writeJson(STORAGE_KEYS.followups, [...followups, followUp]);
    void syncFollowUp(followUp);
    void logEvent("created_followup", {
      contact_id: contact.id,
      priority: contact.priority,
    });
    toast.success("Follow-up created");
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="People extracted from your analyzed inbound will appear here, along with priority and suggested next steps."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Relationship context extracted from your analyzed inbound, sorted by priority."
      />
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Next step</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContacts.map((contact) => {
              const timing = priorityToUrgency(contact.priority);

              return (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{contact.name}</div>
                      {contact.source ? (
                        <div className="text-xs text-muted-foreground">
                          {contact.source}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{contact.organization || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      getTimingBadgeClass(timing),
                    )}
                  >
                    {getTimingLabel(timing)}
                  </span>
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal">
                  <div>{contact.nextStep}</div>
                  {editingId === contact.id ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add note"
                      />
                      <Button size="sm" onClick={() => saveNote(contact)}>
                        Save
                      </Button>
                    </div>
                  ) : contact.note ? (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {contact.note}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Mark as high priority"
                      aria-label="Mark as high priority"
                      onClick={() => markImportant(contact)}
                    >
                      <Star className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Add note"
                      aria-label="Add note"
                      onClick={() => {
                        setEditingId(contact.id);
                        setNote(contact.note ?? "");
                      }}
                    >
                      <StickyNote className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createFollowUp(contact)}
                    >
                      Follow up
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
