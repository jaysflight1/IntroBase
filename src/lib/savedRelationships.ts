import type { ExtractedContact, FollowUp, Priority } from "@/types";

const priorities = new Set<Priority>(["high", "medium", "low"]);
const followUpStatuses = new Set<FollowUp["status"]>([
  "upcoming",
  "due_today",
  "overdue",
  "done",
]);

export function isContact(value: unknown): value is ExtractedContact {
  const contact = value as Partial<ExtractedContact>;

  return (
    typeof contact.id === "string" &&
    typeof contact.name === "string" &&
    typeof contact.source === "string" &&
    Array.isArray(contact.tags) &&
    typeof contact.lastInteractionSummary === "string" &&
    Boolean(contact.priority && priorities.has(contact.priority)) &&
    typeof contact.nextStep === "string"
  );
}

export function isFollowUp(value: unknown): value is FollowUp {
  const followUp = value as Partial<FollowUp>;

  return (
    typeof followUp.id === "string" &&
    typeof followUp.person === "string" &&
    typeof followUp.followUpDate === "string" &&
    typeof followUp.reason === "string" &&
    typeof followUp.suggestedMessage === "string" &&
    Boolean(followUp.status && followUpStatuses.has(followUp.status))
  );
}

export function contactToRow(userId: string, contact: ExtractedContact) {
  return {
    id: contact.id,
    user_id: userId,
    name: contact.name,
    organization: contact.organization ?? "",
    role: contact.role ?? "",
    source: contact.source,
    tags: contact.tags,
    last_interaction_summary: contact.lastInteractionSummary,
    priority: contact.priority,
    next_step: contact.nextStep,
    last_interaction_at: contact.lastInteractionAt ?? null,
    note: contact.note ?? "",
    updated_at: new Date().toISOString(),
  };
}

export function followUpToRow(userId: string, followUp: FollowUp) {
  return {
    id: followUp.id,
    user_id: userId,
    message_id: followUp.messageId ?? "",
    contact_id: followUp.contactId ?? "",
    person: followUp.person,
    follow_up_date: followUp.followUpDate,
    reason: followUp.reason,
    suggested_message: followUp.suggestedMessage,
    status: followUp.status,
    updated_at: new Date().toISOString(),
  };
}

export function rowToContact(row: {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  source: string;
  tags: string[] | null;
  last_interaction_summary: string;
  priority: Priority;
  next_step: string;
  last_interaction_at: string | null;
  note: string | null;
}): ExtractedContact {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization ?? "",
    role: row.role ?? "",
    source: row.source,
    tags: row.tags ?? [],
    lastInteractionSummary: row.last_interaction_summary,
    priority: row.priority,
    nextStep: row.next_step,
    lastInteractionAt: row.last_interaction_at ?? undefined,
    note: row.note ?? undefined,
  };
}

export function rowToFollowUp(row: {
  id: string;
  message_id: string | null;
  contact_id: string | null;
  person: string;
  follow_up_date: string;
  reason: string;
  suggested_message: string;
  status: FollowUp["status"];
}): FollowUp {
  return {
    id: row.id,
    messageId: row.message_id || undefined,
    contactId: row.contact_id || undefined,
    person: row.person,
    followUpDate: row.follow_up_date,
    reason: row.reason,
    suggestedMessage: row.suggested_message,
    status: row.status,
  };
}
