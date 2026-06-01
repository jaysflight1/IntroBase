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
});
