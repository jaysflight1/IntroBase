import type {
  MessageCategory,
  Priority,
  Urgency,
} from "@/types";

import { migrateUrgency } from "@/lib/replyTiming";

export const priorities: Priority[] = ["high", "medium", "low"];

export const urgencies: Urgency[] = [
  "today",
  "this_week",
  "this_month",
  "later",
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
  return migrateUrgency(value);
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
