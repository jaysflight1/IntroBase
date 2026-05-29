import type {
  MessageCategory,
  Priority,
  Urgency,
} from "@/types";

export const priorities: Priority[] = ["high", "medium", "low"];

export const urgencies: Urgency[] = [
  "reply_now",
  "reply_this_week",
  "follow_up_later",
  "low_priority",
  "ignore",
];

export const categories: MessageCategory[] = [
  "investor",
  "customer",
  "hiring",
  "collaborator",
  "mentor",
  "school",
  "personal",
  "application",
  "sales",
  "spam",
  "other",
];

export function normalizePriority(value: unknown): Priority {
  return priorities.includes(value as Priority) ? (value as Priority) : "low";
}

export function normalizeUrgency(value: unknown): Urgency {
  return urgencies.includes(value as Urgency)
    ? (value as Urgency)
    : "low_priority";
}

export function normalizeCategory(value: unknown): MessageCategory {
  return categories.includes(value as MessageCategory)
    ? (value as MessageCategory)
    : "other";
}

export function makeClientId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
