import { describe, expect, it } from "vitest";

import {
  analysisResultSchema,
  analyzePayloadSchema,
  eventPayloadSchema,
} from "@/lib/apiSchemas";

describe("api schemas", () => {
  it("accepts safe analytics event payloads", () => {
    const parsed = eventPayloadSchema.safeParse({
      anonymous_user_id: "anon_123",
      session_id: "session_123",
      event_name: "visited_landing",
      metadata: { source: "test" },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects oversized analysis payloads", () => {
    const parsed = analyzePayloadSchema.safeParse({
      anonymous_user_id: "anon_123",
      session_id: "session_123",
      raw_messages: "x".repeat(25_001),
      user_goals: { prioritize: [], context: "" },
    });

    expect(parsed.success).toBe(false);
  });

  it("validates analysis result shape", () => {
    const parsed = analysisResultSchema.safeParse({
      messages: [
        {
          id: "msg_1",
          source: "Email",
          senderName: "Maya",
          originalText: "Message text",
          summary: "Summary",
          category: "customer",
          priority: "high",
          urgency: "today",
          priorityScore: 90,
          suggestedAction: "Reply",
          suggestedReply: "Thanks",
          whyItMatters: "Potential customer",
          contactTags: ["customer"],
          status: "new",
        },
      ],
      contacts: [],
      sourceTypes: ["Email"],
      categoryCounts: { customer: 1 },
      messageCount: 1,
    });

    expect(parsed.success).toBe(true);
  });
});
