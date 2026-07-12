import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYSIS_MODEL,
  FALLBACK_ANALYSIS_MODEL,
  analyzeRawMessages,
  isProductionOpenAIDisabled,
} from "@/lib/analysis/run";

const goals = {
  prioritize: ["Customers/users"],
  context: "I am testing the analyzer.",
};
const rawMessages = `Source: Email
From: Maya Chen
Message: Can you send the pilot report by Monday?`;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;

function restoreApiKey() {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
    return;
  }

  process.env.OPENAI_API_KEY = originalApiKey;
}

function restoreEnvironment() {
  restoreApiKey();

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
}

describe("analyzeRawMessages diagnostics", () => {
  afterEach(() => {
    restoreEnvironment();
    vi.unstubAllGlobals();
  });

  it("disables OpenAI in production even when an API key is configured", async () => {
    process.env.OPENAI_API_KEY = "test_key";
    process.env.VERCEL_ENV = "production";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeRawMessages(rawMessages, goals);

    expect(isProductionOpenAIDisabled()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.analysisDiagnostics).toEqual({
      engine: "fallback",
      model: FALLBACK_ANALYSIS_MODEL,
      openaiAttempted: false,
      fallbackReason: "production_openai_disabled",
    });
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
    const fetchMock = vi.fn().mockResolvedValue(
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
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeRawMessages(rawMessages, goals);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      response_format?: {
        type?: string;
        json_schema?: { strict?: boolean };
      };
    };

    expect(result.analysisDiagnostics).toEqual({
      engine: "openai",
      model: ANALYSIS_MODEL,
      openaiAttempted: true,
    });
    expect(requestBody.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
  });

  it("repairs empty GPT text fields before validation", async () => {
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
                      senderOrganization: "",
                      senderRole: "",
                      originalText: rawMessages,
                      summary: "Maya needs the pilot report by Monday.",
                      category: "customer",
                      priority: "medium",
                      urgency: "this_week",
                      priorityScore: 72,
                      deadline: "By Monday",
                      suggestedAction: "Send the pilot report by Monday.",
                      suggestedReply: "",
                      whyItMatters: "Potential customer request.",
                      followUpDate: "",
                      contactTags: ["customer"],
                      status: "new",
                    },
                  ],
                  contacts: [
                    {
                      id: "contact_1",
                      name: "Maya Chen",
                      organization: "",
                      role: "",
                      source: "Email",
                      tags: ["customer"],
                      lastInteractionSummary: "Maya needs the pilot report.",
                      priority: "medium",
                      nextStep: "Send the pilot report by Monday.",
                      lastInteractionAt: "",
                    },
                  ],
                  sourceTypes: ["Email"],
                  categoryCounts: {
                    investor: 0,
                    customer: 1,
                    hiring: 0,
                    collaborator: 0,
                    mentor: 0,
                    school: 0,
                    personal: 0,
                    application: 0,
                    sales: 0,
                    spam: 0,
                    other: 0,
                  },
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
    expect(result.messages[0].suggestedReply).toContain("Hi Maya Chen");
    expect(result.messages[0].suggestedReply).toContain(
      "Send the pilot report by Monday.",
    );
  });
});
