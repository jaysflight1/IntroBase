import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYSIS_MODEL,
  FALLBACK_ANALYSIS_MODEL,
  analyzeRawMessages,
} from "@/lib/analysis/run";

const goals = {
  prioritize: ["Customers/users"],
  context: "I am testing the analyzer.",
};
const rawMessages = `Source: Email
From: Maya Chen
Message: Can you send the pilot report by Monday?`;
const originalApiKey = process.env.OPENAI_API_KEY;

function restoreApiKey() {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
    return;
  }

  process.env.OPENAI_API_KEY = originalApiKey;
}

describe("analyzeRawMessages diagnostics", () => {
  afterEach(() => {
    restoreApiKey();
    vi.unstubAllGlobals();
  });

  it("reports local fallback when the API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await analyzeRawMessages(rawMessages, goals);

    expect(result.analysisDiagnostics).toEqual({
      engine: "fallback",
      model: FALLBACK_ANALYSIS_MODEL,
      openaiAttempted: false,
      fallbackReason: "missing_api_key",
    });
    expect(result.messages[0].deadline).toBe("By Monday");
  });

  it("reports fallback when the GPT request fails", async () => {
    process.env.OPENAI_API_KEY = "test_key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
    );

    const result = await analyzeRawMessages(rawMessages, goals);

    expect(result.analysisDiagnostics).toEqual({
      engine: "fallback",
      model: FALLBACK_ANALYSIS_MODEL,
      openaiAttempted: true,
      fallbackReason: "openai_request_failed",
    });
  });

  it("reports GPT usage when the response is valid", async () => {
    process.env.OPENAI_API_KEY = "test_key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  messages: [
                    {
                      id: "msg_1",
                      source: "Email",
                      senderName: "Maya Chen",
                      originalText: rawMessages,
                      summary: "Maya needs the pilot report by Monday.",
                      category: "customer",
                      priority: "medium",
                      urgency: "this_week",
                      priorityScore: 72,
                      deadline: "By Monday",
                      suggestedAction: "Send the pilot report by Monday.",
                      suggestedReply: "Thanks, I will send it by Monday.",
                      whyItMatters: "Potential customer request.",
                      contactTags: ["customer"],
                      status: "new",
                    },
                  ],
                  contacts: [],
                  sourceTypes: ["Email"],
                  categoryCounts: { customer: 1 },
                  messageCount: 1,
                }),
              },
            },
          ],
        }),
      ),
    );

    const result = await analyzeRawMessages(rawMessages, goals);

    expect(result.analysisDiagnostics).toEqual({
      engine: "openai",
      model: ANALYSIS_MODEL,
      openaiAttempted: true,
    });
  });
});
