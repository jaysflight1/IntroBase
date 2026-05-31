import { describe, expect, it } from "vitest";

import { sampleInbox } from "@/data/sampleInbox";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";

const goals = {
  prioritize: ["Investors", "Customers/users", "Applications/deadlines"],
  context:
    "I am a founder/builder trying to avoid missing important opportunities.",
};

describe("createFallbackAnalysis", () => {
  it("keeps high priority count constrained for sample-sized batches", () => {
    const result = createFallbackAnalysis(sampleInbox, goals);

    const highPriorityCount = result.messages.filter(
      (message) => message.priority === "high",
    ).length;

    expect(highPriorityCount).toBeLessThanOrEqual(7);
  });

  it("spreads messages across all priority levels and board lanes", () => {
    const result = createFallbackAnalysis(sampleInbox, goals);

    const priorities = new Set(result.messages.map((m) => m.priority));
    expect(priorities).toEqual(new Set(["high", "medium", "low"]));

    const lanes = new Set(result.messages.map((m) => m.urgency));
    expect(lanes.has("reply_now")).toBe(true);
    expect(lanes.has("reply_this_week")).toBe(true);
    expect(lanes.has("follow_up_later")).toBe(true);
    expect(lanes.has("low_priority")).toBe(true);
  });
});
