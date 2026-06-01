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

const timingVisuals: Record<Urgency, TimingVisual> = {
  today: {
    label: "Today",
    accent: "text-red-700",
    badge: "border-red-200/80 bg-red-50 text-red-700",
    bar: "bg-red-500",
    card: "border-red-200/60 bg-red-50/35",
    column: "border-red-200/70 bg-red-50/50",
    dot: "bg-red-500",
    person: "text-red-950",
    row: "bg-red-50/50",
  },
  this_week: {
    label: "This week",
    accent: "text-orange-700",
    badge: "border-orange-200/80 bg-orange-50 text-orange-800",
    bar: "bg-orange-500",
    card: "border-orange-200/70 bg-orange-50/45",
    column: "border-orange-200/70 bg-orange-50/50",
    dot: "bg-orange-500",
    person: "text-orange-950",
    row: "bg-orange-50/50",
  },
  this_month: {
    label: "This month",
    accent: "text-yellow-800",
    badge: "border-yellow-300/80 bg-yellow-50 text-yellow-900",
    bar: "bg-yellow-400",
    card: "border-yellow-200/70 bg-yellow-50/50",
    column: "border-yellow-200/70 bg-yellow-50/50",
    dot: "bg-yellow-400",
    person: "text-yellow-950",
    row: "bg-yellow-50/55",
  },
  later: {
    label: "Later",
    accent: "text-slate-600",
    badge: "border-slate-200/80 bg-slate-50 text-slate-600",
    bar: "bg-slate-300",
    card: "border-border/80 bg-card",
    column: "border-slate-200/70 bg-slate-50/50",
    dot: "bg-slate-400",
    person: "text-slate-800",
    row: "bg-transparent",
  },
  ignore: {
    label: "Later",
    accent: "text-slate-500",
    badge: "border-slate-200/80 bg-slate-50 text-slate-500",
    bar: "bg-slate-300",
    card: "border-border/80 bg-card",
    column: "border-slate-200/70 bg-slate-50/40",
    dot: "bg-slate-300",
    person: "text-slate-700",
    row: "bg-transparent",
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
