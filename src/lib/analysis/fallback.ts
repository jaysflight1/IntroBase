import type {
  AnalysisResult,
  AnalyzedMessage,
  ExtractedContact,
  MessageCategory,
  Priority,
  Urgency,
  UserGoals,
} from "@/types";

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
  priority: Priority;
  urgency: Urgency;
  score: number;
  tags: string[];
} {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  if (/invest|fund|deck|vc|seed/.test(lower)) {
    tags.push("investor");
    return {
      category: "investor",
      priority: "high",
      urgency: "reply_now",
      score: 92,
      tags,
    };
  }

  if (/customer|pilot|pay|users|try|test|team/.test(lower)) {
    tags.push("customer");
    return {
      category: "customer",
      priority: "high",
      urgency: "reply_now",
      score: 88,
      tags,
    };
  }

  if (/deadline|due|application|document|verification/.test(lower)) {
    tags.push("deadline");
    return {
      category: "application",
      priority: "high",
      urgency: "reply_now",
      score: 84,
      tags,
    };
  }

  if (/mentor|advisor|reviewed|feedback/.test(lower)) {
    tags.push("mentor");
    return {
      category: "mentor",
      priority: "medium",
      urgency: "reply_this_week",
      score: 72,
      tags,
    };
  }

  if (/recruiter|role|hiring|engineer/.test(lower)) {
    tags.push("hiring");
    return {
      category: "hiring",
      priority: "medium",
      urgency: "follow_up_later",
      score: 58,
      tags,
    };
  }

  if (/newsletter|outbound|pricing|leads|sales/.test(lower)) {
    tags.push("sales");
    return {
      category: "sales",
      priority: "low",
      urgency: "low_priority",
      score: 22,
      tags,
    };
  }

  if (/mom|friend|aunt|call/.test(lower)) {
    tags.push("personal");
    return {
      category: "personal",
      priority: "medium",
      urgency: "reply_this_week",
      score: 50,
      tags,
    };
  }

  return {
    category: "other",
    priority: "low",
    urgency: "follow_up_later",
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

export function createFallbackAnalysis(
  rawMessages: string,
  userGoals: UserGoals,
): AnalysisResult {
  const blocks = splitMessages(rawMessages);
  const messages: AnalyzedMessage[] = blocks.map((block, index) => {
    const source = field(block, "Source") || "Other";
    const from = field(block, "From") || `Sender ${index + 1}`;
    const [senderName, senderOrganization] = from.split(/\s+at\s+/i);
    const classified = classify(`${block}\n${userGoals.context}`);
    const summary = summarize(block);
    const followUpDate =
      classified.urgency === "follow_up_later" ? nextBusinessDate(5) : "";

    return {
      id: `msg_${index + 1}`,
      source,
      senderName: senderName.trim(),
      senderOrganization: senderOrganization?.trim() ?? "",
      senderRole: "",
      originalText: block,
      summary,
      category: classified.category,
      priority: classified.priority,
      urgency: classified.urgency,
      priorityScore: classified.score,
      deadline: /due|deadline/i.test(block) ? "Check message deadline" : "",
      suggestedAction:
        classified.priority === "high"
          ? "Reply today with a clear next step."
          : classified.priority === "medium"
            ? "Reply this week or schedule a follow-up."
            : "Archive, ignore, or handle after higher-priority messages.",
      suggestedReply:
        classified.priority === "low"
          ? "Thanks for reaching out. I am focused on a few priorities right now, but I appreciate the note."
          : "Thanks for reaching out. This is relevant, and I would like to find a good next step. Are you available for a brief call this week?",
      whyItMatters:
        classified.priority === "high"
          ? "This message appears tied to a concrete opportunity, deadline, customer, or investor conversation."
          : "This message may be useful, but it is less urgent than the highest-value inbound.",
      followUpDate,
      contactTags: classified.tags,
      status: "new",
    };
  });

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
    sourceTypes: Array.from(new Set(messages.map((message) => message.source))),
    categoryCounts,
    messageCount: messages.length,
  };
}
