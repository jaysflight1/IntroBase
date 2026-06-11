import type {
  AnalysisResult,
  AnalyzedMessage,
  Priority,
  Urgency,
} from "@/types";

export interface TimingVisual {
  accent: string;
  badge: string;
  bar: string;
  card: string;
  column: string;
  dot: string;
  label: string;
  person: string;
  row: string;
}

export const TIMING_COLUMNS: { title: string; urgencies: Urgency[] }[] = [
  { title: "Today", urgencies: ["today"] },
  { title: "This week", urgencies: ["this_week"] },
  { title: "This month", urgencies: ["this_month"] },
  { title: "Later", urgencies: ["later", "ignore"] },
];

export const REPLY_TIMINGS: Urgency[] = [
  "today",
  "this_week",
  "this_month",
  "later",
];

// Urgency is signaled by small, precise accents (left rail, dot, badge) on
// neutral surfaces — never by tinting whole cards or columns.
const timingVisuals: Record<Urgency, TimingVisual> = {
  today: {
    label: "Today",
    accent: "text-red-600",
    badge: "border-red-200 bg-red-50 text-red-700",
    bar: "bg-red-500",
    card: "border-l-[3px] border-l-red-500",
    column: "",
    dot: "bg-red-500",
    person: "text-foreground",
    row: "",
  },
  this_week: {
    label: "This week",
    accent: "text-amber-600",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    card: "border-l-[3px] border-l-amber-500",
    column: "",
    dot: "bg-amber-500",
    person: "text-foreground",
    row: "",
  },
  this_month: {
    label: "This month",
    accent: "text-blue-600",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    bar: "bg-blue-500",
    card: "border-l-[3px] border-l-blue-500",
    column: "",
    dot: "bg-blue-500",
    person: "text-foreground",
    row: "",
  },
  later: {
    label: "Later",
    accent: "text-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
    card: "border-l-[3px] border-l-slate-300",
    column: "",
    dot: "bg-slate-400",
    person: "text-foreground",
    row: "",
  },
  ignore: {
    label: "Later",
    accent: "text-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-500",
    bar: "bg-slate-300",
    card: "border-l-[3px] border-l-slate-300",
    column: "",
    dot: "bg-slate-300",
    person: "text-foreground",
    row: "",
  },
};

const legacyUrgencyMap: Record<string, Urgency> = {
  reply_now: "today",
  reply_this_week: "this_week",
  follow_up_later: "this_month",
  low_priority: "later",
  today: "today",
  this_week: "this_week",
  this_month: "this_month",
  later: "later",
  ignore: "ignore",
};

export function migrateUrgency(value: unknown): Urgency {
  if (typeof value === "string" && value in legacyUrgencyMap) {
    return legacyUrgencyMap[value];
  }
  return "later";
}

export function urgencyToPriority(urgency: Urgency): Priority {
  if (urgency === "today") return "high";
  if (urgency === "this_week" || urgency === "this_month") return "medium";
  return "low";
}

export function priorityToUrgency(priority: Priority): Urgency {
  if (priority === "high") return "today";
  if (priority === "medium") return "this_week";
  return "later";
}

export function getTimingVisual(urgency: Urgency): TimingVisual {
  return timingVisuals[migrateUrgency(urgency)];
}

export function getTimingLabel(urgency: Urgency): string {
  return getTimingVisual(urgency).label;
}

export function getTimingBadgeClass(urgency: Urgency): string {
  return getTimingVisual(urgency).badge;
}

export function getTimingCardClass(urgency: Urgency): string {
  return getTimingVisual(urgency).card;
}

export function getTimingPersonClass(urgency: Urgency): string {
  return getTimingVisual(urgency).person;
}

export function getTimingRowClass(urgency: Urgency): string {
  return getTimingVisual(urgency).row;
}

export function getTimingBarClass(urgency: Urgency): string {
  return getTimingVisual(urgency).bar;
}

export function getTimingAccentClass(urgency: Urgency): string {
  return getTimingVisual(urgency).accent;
}

export function getTimingColumnClass(urgency: Urgency): string {
  return getTimingVisual(urgency).column;
}

export function getTimingDotClass(urgency: Urgency): string {
  return getTimingVisual(urgency).dot;
}

export function syncMessageTiming(message: AnalyzedMessage): AnalyzedMessage {
  const urgency = migrateUrgency(message.urgency);
  return {
    ...message,
    urgency,
    priority: urgencyToPriority(urgency),
  };
}

export function migrateAnalysisResult(result: AnalysisResult): AnalysisResult {
  const messages = result.messages.map(syncMessageTiming);
  return {
    ...result,
    messages,
    contacts: result.contacts.map((contact) => ({
      ...contact,
      priority: urgencyToPriority(
        migrateUrgency(
          messages.find((message) => message.senderName === contact.name)
            ?.urgency ?? priorityToUrgency(contact.priority),
        ),
      ),
    })),
  };
}
