import { describe, expect, it } from "vitest";

import {
  getMessageTimingLabel,
  migrateAnalysisResult,
} from "@/lib/replyTiming";
import type { AnalysisResult } from "@/types";

const baseResult: AnalysisResult = {
  messages: [
    {
      id: "msg_1",
      source: "Email",
      senderName: "Sam Patel",
      originalText: "Can you send the report by Monday?",
      summary: "Sam asked for the report by Monday.",
      category: "customer",
      priority: "medium",
      urgency: "this_week",
      priorityScore: 80,
      deadline: "By Monday",
      suggestedAction: "Send the report by Monday.",
      suggestedReply: "I will send it over by Monday.",
      whyItMatters: "There is a clear deadline.",
      contactTags: ["customer"],
      status: "new",
    },
  ],
  contacts: [
    {
      id: "contact_msg_1",
      name: "Sam Patel",
      source: "Email",
      tags: ["customer"],
      lastInteractionSummary: "Sam asked for the report by Monday.",
      priority: "medium",
      nextStep: "Reply this week after the highest-priority items.",
    },
  ],
  sourceTypes: ["Email"],
  categoryCounts: { customer: 1 },
  messageCount: 1,
};

describe("reply timing helpers", () => {
  it("uses message-specific deadline labels when present", () => {
    expect(getMessageTimingLabel(baseResult.messages[0])).toBe("By Monday");
  });

  it("ignores legacy generic deadline labels", () => {
    expect(
      getMessageTimingLabel({
        urgency: "today",
        deadline: "Check message deadline",
      }),
    ).toBe("Today");
  });

  it("replaces generic contact next steps with message-specific actions", () => {
    const migrated = migrateAnalysisResult(baseResult);

    expect(migrated.contacts[0].nextStep).toBe("Send the report by Monday.");
  });
});
