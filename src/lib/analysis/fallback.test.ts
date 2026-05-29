import { describe, expect, it } from "vitest";

import { sampleInbox } from "@/data/sampleInbox";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";

describe("createFallbackAnalysis", () => {
  it("keeps high priority count constrained for sample-sized batches", () => {
    const result = createFallbackAnalysis(sampleInbox, {
      prioritize: ["Investors", "Customers/users", "Applications/deadlines"],
      context:
        "I am a founder/builder trying to avoid missing important opportunities.",
    });

    const highPriorityCount = result.messages.filter(
      (message) => message.priority === "high",
    ).length;

    expect(highPriorityCount).toBeLessThanOrEqual(7);
  });
});
