import { describe, expect, it } from "vitest";

import { sampleInbox } from "@/data/sampleInbox";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";

const goals = {
  prioritize: ["Investors", "Customers/users", "Applications/deadlines"],
  context:
    "I am a founder/builder trying to avoid missing important opportunities.",
};

describe("createFallbackAnalysis", () => {
  it("keeps today count constrained for sample-sized batches", () => {
    const result = createFallbackAnalysis(sampleInbox, goals);

    const todayCount = result.messages.filter(
      (message) => message.urgency === "today",
    ).length;

    expect(todayCount).toBeLessThanOrEqual(7);
  });

  it("spreads messages across reply timing lanes", () => {
    const result = createFallbackAnalysis(sampleInbox, goals);

    const lanes = new Set(result.messages.map((message) => message.urgency));
    expect(lanes.has("today")).toBe(true);
    expect(lanes.has("this_week")).toBe(true);
    expect(lanes.has("this_month")).toBe(true);
    expect(lanes.has("later")).toBe(true);
  });

  it("extracts message-specific deadline badges and next steps", () => {
    const result = createFallbackAnalysis(
      `Source: Email
From: Alex Rivera
Message: I need this done by noon.

Source: Email
From: Sam Patel
Message: Can you send the report by Monday?`,
      goals,
    );

    expect(result.messages[0]).toMatchObject({
      urgency: "today",
      deadline: "By Noon",
      suggestedAction: "Finish this by noon.",
    });
    expect(result.contacts[0].nextStep).toBe("Finish this by noon.");

    expect(result.messages[1]).toMatchObject({
      deadline: "By Monday",
      suggestedAction: "Send the report by Monday.",
    });
    expect(result.contacts[1].nextStep).toBe("Send the report by Monday.");
  });

  it("uses exact due times in deadline-specific actions", () => {
    const result = createFallbackAnalysis(
      `Source: Email
From: Design Partner Program
Message: Reminder: the design partner intake form is due by Friday at 5 PM PT if you want to be included.`,
      goals,
    );

    expect(result.messages[0]).toMatchObject({
      deadline: "By Friday 5 PM PT",
      suggestedAction:
        "Complete the design partner intake form by Friday 5 PM PT.",
    });
  });

  it("parses letter-style messages with signature senders", () => {
    const result = createFallbackAnalysis(
      `Dear Name,

I followed up with you earlier about my application but didn't hear back. Do you know when we will know whether we were accepted?

Best,
Sender.`,
      goals,
    );

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      senderName: "Sender",
      originalText:
        "I followed up with you earlier about my application but didn't hear back. Do you know when we will know whether we were accepted?",
      summary:
        "I followed up with you earlier about my application but didn't hear back. Do you know when we will know whether we were accepted?",
    });
  });

  it("uses explicit source and from fields around letter-style messages", () => {
    const result = createFallbackAnalysis(
      `Dear Jaylan,

Can you review the application update by Tuesday?

Best,
Talya
Source: Gmail
From: Talya Rivera

Source: Slack
From: Jordan
Message: Following up on the customer discovery interview.`,
      goals,
    );

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toMatchObject({
      source: "Gmail",
      senderName: "Talya Rivera",
      originalText: "Can you review the application update by Tuesday?",
      deadline: "By Tuesday",
    });
    expect(result.messages[1]).toMatchObject({
      source: "Slack",
      senderName: "Jordan",
      originalText: "Following up on the customer discovery interview.",
    });
  });
});
