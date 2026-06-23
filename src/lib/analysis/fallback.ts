import type {
  AnalysisResult,
  AnalyzedMessage,
  ExtractedContact,
  MessageCategory,
  Urgency,
  UserGoals,
} from "@/types";

import { syncMessageTiming, urgencyToPriority } from "@/lib/replyTiming";

function splitMessages(rawMessages: string): string[] {
  const sourceBlocks = rawMessages
    .split(/\n(?=Source:\s*)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  if (sourceBlocks.length > 1) return sourceBlocks.slice(0, 50);

  return rawMessages
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function field(block: string, label: string): string {
  const match = block.match(new RegExp(`${label}:\\s*(.+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function messageBody(block: string): string {
  return block
    .replace(/^Source:.+$/gim, "")
    .replace(/^From:.+$/gim, "")
    .replace(/^Message:\s*/gim, "")
    .trim();
}

function classify(text: string): {
  category: MessageCategory;
  urgency: Urgency;
  score: number;
  tags: string[];
} {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  if (/invest|fund|deck|\bvc\b|seed|raising/.test(lower)) {
    tags.push("investor");
    return {
      category: "investor",
      urgency: "today",
      score: 92,
      tags,
    };
  }

  if (/customer|pilot|\bpay\b|\busers?\b|\btry\b|\btest\b|\bteam\b/.test(lower)) {
    tags.push("customer");
    return {
      category: "customer",
      urgency: "today",
      score: 88,
      tags,
    };
  }

  if (/deadline|\bdue\b|application|document|verification/.test(lower)) {
    tags.push("deadline");
    return {
      category: "application",
      urgency: "today",
      score: 84,
      tags,
    };
  }

  if (/mentor|advisor|reviewed|feedback/.test(lower)) {
    tags.push("mentor");
    return {
      category: "mentor",
      urgency: "this_week",
      score: 72,
      tags,
    };
  }

  if (/recruiter|\brole\b|hiring|\bengineer\b/.test(lower)) {
    tags.push("hiring");
    return {
      category: "hiring",
      urgency: "this_month",
      score: 58,
      tags,
    };
  }

  if (/newsletter|outbound|pricing|leads|\bsales\b/.test(lower)) {
    tags.push("sales");
    return {
      category: "sales",
      urgency: "later",
      score: 22,
      tags,
    };
  }

  if (/friend|family|personal|\bcall\b/.test(lower)) {
    tags.push("personal");
    return {
      category: "personal",
      urgency: "this_week",
      score: 50,
      tags,
    };
  }

  return {
    category: "other",
    urgency: "this_month",
    score: 40,
    tags: ["inbound"],
  };
}

function summarize(message: string): string {
  const cleaned = messageBody(message);

  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137).trim()}...`;
}

function nextBusinessDate(days = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayBudget(messageCount: number): number {
  if (messageCount <= 6) return Math.min(3, messageCount);
  if (messageCount <= 12) return 5;
  if (messageCount <= 20) return 7;
  return Math.ceil(messageCount * 0.35);
}

interface DeadlineInsight {
  label: string;
  suffix: string;
}

const deadlineTarget =
  "(?:noon|midnight|eod|end of day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s+(?:at\\s+)?\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)?(?:\\s*(?:pt|et|ct|mt|pst|est|cst|mst|utc))?)?";

function titleCaseWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
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
    .replace(/\b(noon|midnight|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, (word) =>
      titleCaseWord(word),
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

function parseDeadline(text: string): DeadlineInsight | null {
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

function urgencyForDeadline(deadline: DeadlineInsight | null): Urgency | null {
  if (!deadline) return null;
  if (/\b(Noon|Midnight|Today|Tomorrow)\b/i.test(deadline.label)) {
    return "today";
  }
  if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(deadline.label)) {
    return "this_week";
  }
  return null;
}

function toSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
}

function taskForMessage(text: string): string {
  const body = messageBody(text);
  const sentence = sentenceWithDeadline(body);

  if (/\bneed this (?:done|finished|completed)\b/i.test(sentence)) {
    return "Finish this";
  }

  const requestedObject = sentence.match(
    /\b(?:asked|asking)\s+for\s+(?:a\s+|an\s+|the\s+)?([^.!?]+?)(?:\s+\b(?:by|before|due)\b|$)/i,
  )?.[1];
  if (requestedObject) {
    return `Send the ${cleanTaskPhrase(requestedObject)}`;
  }

  const dueSubject = sentence.match(
    /\b(?:the\s+)?([^.!?]{3,80}?)\s+(?:is|are)\s+due\s+(?:by|before)\b/i,
  )?.[1];
  if (dueSubject) {
    return `Complete the ${cleanTaskPhrase(dueSubject)}`;
  }

  const ask = sentence.match(
    /\b(?:can you|could you|please|would you|i need you to|we need you to|need you to)\s+([^.!?]+?)(?:\s+\b(?:by|before|due)\b|$)/i,
  )?.[1];
  if (ask) {
    const task = cleanTaskPhrase(ask);
    if (/^send\b/i.test(task)) return task;
    return task;
  }

  const verbTask = sentence.match(
    /\b(send|submit|complete|finish|review|share|confirm|verify|upload|test|try|schedule|fix|check)\b([^.!?]{0,90})/i,
  );
  if (verbTask) {
    return cleanTaskPhrase(`${verbTask[1]}${verbTask[2]}`);
  }

  if (/deck/i.test(body)) return "Send the deck and propose meeting times";
  if (/\b(pilot|try|test)\b/i.test(body)) return "Help them try Introbase";
  if (/\bmeet|talk|call\b/i.test(body)) return "Schedule the conversation";
  if (/\bbug\b/i.test(body)) return "Triage the reported bug";
  if (/\brole\b|founding engineer|recruiter/i.test(body)) {
    return "Reply about whether the role is a fit";
  }

  return "Reply with the next step";
}

function suggestedActionFor(
  urgency: Urgency,
  text: string,
  deadline: DeadlineInsight | null,
): string {
  if (deadline) {
    return toSentence(`${taskForMessage(text)} ${deadline.suffix}`);
  }

  const task = taskForMessage(text);
  if (task !== "Reply with the next step") return toSentence(task);

  if (urgency === "today") return "Reply today with a clear next step.";
  if (urgency === "this_week") return "Reply this week or schedule a follow-up.";
  if (urgency === "this_month") {
    return "Follow up this month when you have bandwidth.";
  }
  return "Archive, ignore, or handle after higher-priority messages.";
}

function whyItMattersFor(urgency: Urgency): string {
  if (urgency === "today") {
    return "This message appears tied to a concrete opportunity, deadline, customer, or investor conversation.";
  }
  if (urgency === "later") {
    return "This message may be useful, but it can wait behind more time-sensitive inbound.";
  }
  return "This message may be useful, but it is less urgent than the most time-sensitive inbound.";
}

function applyTodayBudget(messages: AnalyzedMessage[]): AnalyzedMessage[] {
  const budget = todayBudget(messages.length);
  let todayCount = 0;

  return [...messages]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((message) => {
      if (message.urgency !== "today") return message;
      todayCount += 1;

      if (todayCount <= budget || message.priorityScore >= 95) {
        return message;
      }

      return syncMessageTiming({
        ...message,
        urgency: "this_week",
        suggestedAction: suggestedActionFor("this_week", message.originalText, null),
        whyItMatters:
          "This is relevant, but it ranks below the most urgent messages in this batch.",
      });
    })
    .sort((a, b) => Number(a.id.split("_")[1]) - Number(b.id.split("_")[1]));
}

export function createFallbackAnalysis(
  rawMessages: string,
  // Kept for signature parity with the LLM path; the heuristic classifier
  // intentionally ignores goal context to avoid keyword false positives.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userGoals: UserGoals,
): AnalysisResult {
  const blocks = splitMessages(rawMessages);
  const initialMessages: AnalyzedMessage[] = blocks.map((block, index) => {
    const source = field(block, "Source");
    const from = field(block, "From") || `Sender ${index + 1}`;
    const [senderName, senderOrganization] = from.split(/\s+at\s+/i);
    const classified = classify(block);
    const deadline = parseDeadline(block);
    const urgency = urgencyForDeadline(deadline) ?? classified.urgency;
    const summary = summarize(block);
    const followUpDate =
      urgency === "this_month" || urgency === "later"
        ? nextBusinessDate(urgency === "later" ? 14 : 7)
        : "";

    return syncMessageTiming({
      id: `msg_${index + 1}`,
      source,
      senderName: senderName.trim(),
      senderOrganization: senderOrganization?.trim() ?? "",
      senderRole: "",
      originalText: block,
      summary,
      category: classified.category,
      priority: urgencyToPriority(urgency),
      urgency,
      priorityScore: classified.score,
      deadline: deadline?.label ?? "",
      suggestedAction: suggestedActionFor(urgency, block, deadline),
      suggestedReply:
        classified.urgency === "later"
          ? "Thanks for reaching out. I am focused on a few priorities right now, but I appreciate the note."
          : "Thanks for reaching out. This is relevant, and I would like to find a good next step. Are you available for a brief call this week?",
      whyItMatters: whyItMattersFor(classified.urgency),
      followUpDate,
      contactTags: classified.tags,
      status: "new",
    });
  });
  const messages = applyTodayBudget(initialMessages);

  const contacts: ExtractedContact[] = messages
    .filter((message) => message.category !== "spam" && message.category !== "sales")
    .map((message) => ({
      id: `contact_${message.id}`,
      name: message.senderName,
      organization: message.senderOrganization,
      role: message.senderRole,
      source: message.source,
      tags: message.contactTags,
      lastInteractionSummary: message.summary,
      priority: message.priority,
      nextStep: message.suggestedAction,
      lastInteractionAt: new Date().toISOString(),
    }));

  const categoryCounts = messages.reduce<Record<string, number>>(
    (counts, message) => {
      counts[message.category] = (counts[message.category] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    messages,
    contacts,
    sourceTypes: Array.from(
      new Set(messages.map((message) => message.source).filter(Boolean)),
    ),
    categoryCounts,
    messageCount: messages.length,
  };
}
