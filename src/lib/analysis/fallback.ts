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
  const cleaned = message
    .replace(/^Source:.+$/gim, "")
    .replace(/^From:.+$/gim, "")
    .replace(/^Message:\s*/gim, "")
    .trim();

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

function suggestedActionFor(urgency: Urgency): string {
  if (urgency === "today") return "Reply today with a clear next step.";
  if (urgency === "this_week") return "Reply this week or schedule a follow-up.";
  if (urgency === "this_month") return "Follow up this month when you have bandwidth.";
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
        suggestedAction: "Reply this week after the most time-sensitive messages.",
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
    const summary = summarize(block);
    const followUpDate =
      classified.urgency === "this_month" || classified.urgency === "later"
        ? nextBusinessDate(classified.urgency === "later" ? 14 : 7)
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
      priority: urgencyToPriority(classified.urgency),
      urgency: classified.urgency,
      priorityScore: classified.score,
      deadline: /due|deadline/i.test(block) ? "Check message deadline" : "",
      suggestedAction: suggestedActionFor(classified.urgency),
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
