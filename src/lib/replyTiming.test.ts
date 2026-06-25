import { describe, expect, it } from "vitest";

import {
  compareMessagesByDeadlineUrgency,
  getDeadlineDistanceDays,
  getMessageTimingLabel,
  migrateAnalysisResult,
  urgencyForDeadlineText,
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

  it("infers missing deadline labels from existing message text", () => {
    const migrated = migrateAnalysisResult({
      ...baseResult,
      messages: [
        {
          ...baseResult.messages[0],
          originalText: "Message: I need this done by noon.",
          urgency: "this_month",
          deadline: "",
          suggestedAction: "Reply today with a clear next step.",
        },
      ],
    });

    expect(migrated.messages[0]).toMatchObject({
      urgency: "today",
      deadline: "By Noon",
      suggestedAction: "Finish this by noon.",
    });
  });

  it("keeps broad timing labels as manual lane assignments", () => {
    const migrated = migrateAnalysisResult({
      ...baseResult,
      messages: [
        {
          ...baseResult.messages[0],
          originalText: "Message: I need this done by noon.",
          urgency: "later",
          deadline: "Later",
          suggestedAction: "Handle later.",
        },
      ],
    });

    expect(migrated.messages[0]).toMatchObject({
      urgency: "later",
      deadline: "Later",
    });
  });

  it("uses edited custom deadline labels as the urgency source", () => {
    const migrated = migrateAnalysisResult({
      ...baseResult,
      messages: [
        {
          ...baseResult.messages[0],
          originalText: "Message: I need this done by noon.",
          urgency: "today",
          deadline: "By Next Week",
        },
      ],
    });

    expect(migrated.messages[0]).toMatchObject({
      urgency: "this_month",
      deadline: "By Next Week",
    });
  });

  it("maps estimated deadline distance to broad timing lanes", () => {
    const referenceDate = new Date("2026-06-24T12:00:00Z");

    expect(urgencyForDeadlineText("By Noon", referenceDate)).toBe("today");
    expect(urgencyForDeadlineText("By Tomorrow", referenceDate)).toBe(
      "this_week",
    );
    expect(urgencyForDeadlineText("Within 2 Days", referenceDate)).toBe(
      "this_week",
    );
    expect(urgencyForDeadlineText("By Next Week", referenceDate)).toBe(
      "this_month",
    );
    expect(urgencyForDeadlineText("By Next Month", referenceDate)).toBe("later");
  });

  it("sorts messages with closer deadlines first", () => {
    const messages = [
      { deadline: "By Next Week", priorityScore: 95 },
      { deadline: "By Tomorrow", priorityScore: 70 },
      { deadline: "Within 2 Days", priorityScore: 90 },
      { deadline: "", priorityScore: 100 },
    ].sort(compareMessagesByDeadlineUrgency);

    expect(messages.map((message) => message.deadline)).toEqual([
      "By Tomorrow",
      "Within 2 Days",
      "By Next Week",
      "",
    ]);
  });

  it("estimates concrete month dates from the current date", () => {
    expect(
      getDeadlineDistanceDays("By July 1", new Date("2026-06-24T12:00:00Z")),
    ).toBe(7);
  });
});
