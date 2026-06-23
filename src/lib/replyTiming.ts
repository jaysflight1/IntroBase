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

interface ParsedDeadline {
  label: string;
  suffix: string;
}

function normalizeDeadlineLabel(deadline: string | undefined): string {
  const label = deadline?.trim() ?? "";
  if (label.toLowerCase() === "check message deadline") return "";
  return label;
}

const deadlineTarget =
  "(?:noon|midnight|eod|end of day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s+(?:at\\s+)?\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)?(?:\\s*(?:pt|et|ct|mt|pst|est|cst|mst|utc))?)?";

function titleCaseWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function messageBody(text: string): string {
  return text
    .replace(/^Source:.+$/gim, "")
    .replace(/^From:.+$/gim, "")
    .replace(/^Message:\s*/gim, "")
    .trim();
}

function normalizeDeadlineTarget(value: string): string {
  return value
    .replace(/\bend of day\b/i, "EOD")
    .replace(/\beod\b/i, "EOD")
    .replace(/\ba\.?m\.?\b/gi, "AM")
    .replace(/\bp\.?m\.?\b/gi, "PM")
    .replace(/\b(pt|et|ct|mt|pst|est|cst|mst|utc)\b/gi, (zone) =>
      zone.toUpperCase(),
    )
    .replace(
      /\b(noon|midnight|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      (word) => titleCaseWord(word),
    )
    .replace(/\s+at\s+/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function actionDeadlineSuffix(target: string): string {
  if (/^(Noon|Midnight|Today|Tomorrow)$/i.test(target)) {
    return `by ${target.toLowerCase()}`;
  }
  return `by ${target}`;
}

function parseDeadline(text: string): ParsedDeadline | null {
  const body = messageBody(text);
  const patterns = [
    new RegExp(`\\bby\\s+(${deadlineTarget})\\b`, "i"),
    new RegExp(`\\bbefore\\s+(${deadlineTarget})\\b`, "i"),
    new RegExp(`\\bdue\\s+(?:by\\s+)?(${deadlineTarget})\\b`, "i"),
    new RegExp(`\\bneeded\\s+(?:by|before)\\s+(${deadlineTarget})\\b`, "i"),
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (!match?.[1]) continue;

    const target = normalizeDeadlineTarget(match[1]);
    return {
      label: `By ${target}`,
      suffix: actionDeadlineSuffix(target),
    };
  }

  return null;
}

function urgencyForDeadline(deadline: ParsedDeadline | null): Urgency | null {
  if (!deadline) return null;
  if (/\b(Noon|Midnight|Today|Tomorrow)\b/i.test(deadline.label)) {
    return "today";
  }
  if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(deadline.label)) {
    return "this_week";
  }
  return null;
}

function sentenceWithDeadline(body: string): string {
  const sentences = body
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return (
    sentences.find((sentence) =>
      /\b(by|before|due|needed)\b|noon|tomorrow|monday|tuesday|wednesday|thursday|friday/i.test(
        sentence,
      ),
    ) ??
    sentences[0] ??
    body
  );
}

function cleanTaskPhrase(value: string): string {
  return value
    .replace(/^reminder:\s*/i, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/\s+\b(?:by|before|due)\b.*$/i, "")
    .replace(/\bmaybe\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    .trim();
}

function taskForMessage(text: string): string {
  const body = messageBody(text);
  const sentence = sentenceWithDeadline(body);

  if (/\bneed this (?:done|finished|completed)\b/i.test(sentence)) {
    return "Finish this";
  }

  const dueSubject = sentence.match(
    /\b(?:the\s+)?([^.!?]{3,80}?)\s+(?:is|are)\s+due\s+(?:by|before)\b/i,
  )?.[1];
  if (dueSubject) return `Complete the ${cleanTaskPhrase(dueSubject)}`;

  const ask = sentence.match(
    /\b(?:can you|could you|please|would you|i need you to|we need you to|need you to)\s+([^.!?]+?)(?:\s+\b(?:by|before|due)\b|$)/i,
  )?.[1];
  if (ask) return cleanTaskPhrase(ask);

  const verbTask = sentence.match(
    /\b(send|submit|complete|finish|review|share|confirm|verify|upload|test|try|schedule|fix|check)\b([^.!?]{0,90})/i,
  );
  if (verbTask) return cleanTaskPhrase(`${verbTask[1]}${verbTask[2]}`);

  return "Reply with the next step";
}

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function actionForDeadline(text: string, deadline: ParsedDeadline): string {
  return `${sentenceCase(taskForMessage(text))} ${deadline.suffix}.`;
}

export function getMessageTimingLabel(
  message: Pick<AnalyzedMessage, "deadline" | "urgency">,
): string {
  return normalizeDeadlineLabel(message.deadline) || getTimingLabel(message.urgency);
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
  const deadline = parseDeadline(message.originalText);
  const urgency = urgencyForDeadline(deadline) ?? migrateUrgency(message.urgency);
  const normalizedDeadline =
    normalizeDeadlineLabel(message.deadline) || deadline?.label || "";

  return {
    ...message,
    deadline: normalizedDeadline,
    suggestedAction:
      deadline && hasGenericNextStep(message.suggestedAction)
        ? actionForDeadline(message.originalText, deadline)
        : message.suggestedAction,
    urgency,
    priority: urgencyToPriority(urgency),
  };
}

function hasGenericNextStep(nextStep: string): boolean {
  return [
    "reply today with a clear next step.",
    "reply this week after the highest-priority items.",
    "reply this week or schedule a follow-up.",
    "reply this week after the most time-sensitive messages.",
    "follow up this month when you have bandwidth.",
    "archive, ignore, or handle after higher-priority messages.",
  ].includes(nextStep.trim().toLowerCase());
}

export function migrateAnalysisResult(result: AnalysisResult): AnalysisResult {
  const messages = result.messages.map(syncMessageTiming);
  return {
    ...result,
    messages,
    contacts: result.contacts.map((contact) => {
      const matchingMessage = messages.find(
        (message) => message.senderName === contact.name,
      );

      return {
        ...contact,
        nextStep:
          matchingMessage && hasGenericNextStep(contact.nextStep)
            ? matchingMessage.suggestedAction
            : contact.nextStep,
        priority: urgencyToPriority(
          migrateUrgency(
            matchingMessage?.urgency ?? priorityToUrgency(contact.priority),
          ),
        ),
      };
    }),
  };
}
