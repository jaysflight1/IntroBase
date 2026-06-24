import { analysisResultSchema } from "@/lib/apiSchemas";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { normalizeSourceValue } from "@/lib/normalizeSource";
import { migrateAnalysisResult } from "@/lib/replyTiming";
import type {
  AnalysisDiagnostics,
  AnalysisResult,
  AnalyzedMessage,
  UserGoals,
} from "@/types";

export const ANALYSIS_MODEL = "gpt-4.1-mini";
export const FALLBACK_ANALYSIS_MODEL = "local_fallback";

const analysisResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "introbase_analysis_result",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "messages",
        "contacts",
        "sourceTypes",
        "categoryCounts",
        "messageCount",
      ],
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "source",
              "senderName",
              "senderOrganization",
              "senderRole",
              "originalText",
              "summary",
              "category",
              "priority",
              "urgency",
              "priorityScore",
              "deadline",
              "suggestedAction",
              "suggestedReply",
              "whyItMatters",
              "followUpDate",
              "contactTags",
              "status",
            ],
            properties: {
              id: { type: "string" },
              source: { type: "string" },
              senderName: { type: "string" },
              senderOrganization: { type: "string" },
              senderRole: { type: "string" },
              originalText: { type: "string" },
              summary: { type: "string" },
              category: {
                type: "string",
                enum: [
                  "investor",
                  "customer",
                  "hiring",
                  "collaborator",
                  "mentor",
                  "school",
                  "personal",
                  "application",
                  "sales",
                  "spam",
                  "other",
                ],
              },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              urgency: {
                type: "string",
                enum: ["today", "this_week", "this_month", "later", "ignore"],
              },
              priorityScore: { type: "number" },
              deadline: { type: "string" },
              suggestedAction: { type: "string" },
              suggestedReply: { type: "string" },
              whyItMatters: { type: "string" },
              followUpDate: { type: "string" },
              contactTags: { type: "array", items: { type: "string" } },
              status: {
                type: "string",
                enum: ["new", "replied", "follow_up", "ignored"],
              },
            },
          },
        },
        contacts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "name",
              "organization",
              "role",
              "source",
              "tags",
              "lastInteractionSummary",
              "priority",
              "nextStep",
              "lastInteractionAt",
            ],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              organization: { type: "string" },
              role: { type: "string" },
              source: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              lastInteractionSummary: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              nextStep: { type: "string" },
              lastInteractionAt: { type: "string" },
            },
          },
        },
        sourceTypes: { type: "array", items: { type: "string" } },
        categoryCounts: {
          type: "object",
          additionalProperties: false,
          required: [
            "investor",
            "customer",
            "hiring",
            "collaborator",
            "mentor",
            "school",
            "personal",
            "application",
            "sales",
            "spam",
            "other",
          ],
          properties: {
            investor: { type: "number" },
            customer: { type: "number" },
            hiring: { type: "number" },
            collaborator: { type: "number" },
            mentor: { type: "number" },
            school: { type: "number" },
            personal: { type: "number" },
            application: { type: "number" },
            sales: { type: "number" },
            spam: { type: "number" },
            other: { type: "number" },
          },
        },
        messageCount: { type: "number" },
      },
    },
  },
} as const;

async function analyzeWithOpenAI(rawMessages: string, userGoals: UserGoals) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      temperature: 0.2,
      response_format: analysisResponseFormat,
      messages: [
        {
          role: "system",
          content:
            "You are Introbase, an AI system that turns messy pasted inbound messages into a structured reply inbox for founders and busy builders. Accept multiple pasted-message formats. Some messages may use explicit fields like \"Source:\", \"From:\", and \"Message:\". Others may look like ordinary emails or letters, for example \"Dear Name,\" followed by body text and a closing such as \"Best,\" then the sender's name. Treat each letter-style email as one message, even when it contains blank lines. For letter-style emails, remove the greeting and closing/signature from originalText, infer senderName from the signature, and use only the body as the message text. If explicit \"Source:\" and/or \"From:\" lines appear below or near a letter-style message, use those values; an explicit \"From:\" value should override the signature sender. Assign each message exactly one urgency timing: today (reply today), this_week (reply this week), this_month (reply this month), later (low urgency), or ignore. Also set priority to match timing: today=high, this_week=medium, this_month=medium, later=low, ignore=low. Prioritize opportunity value, time sensitivity, relationship importance, specific asks or deadlines, and relevance to the user's goals. Do not over-rank generic spam, newsletters, vague sales pitches, or low-effort messages. Use today sparingly: for a normal 10-20 message batch, aim for roughly 5-7 today items unless true urgency clearly requires more. Carefully scan every message for specific dates, weekdays, times, or timelines: examples include \"by noon\", \"tomorrow\", \"by Tuesday\", \"Friday at 5 PM PT\", \"next week\", \"within 48 hours\", \"before the partner meeting\", \"due Monday\", and concrete calendar dates. If any specific date/timeline affects when the user should act, reflect it in the message's deadline field as a short user-facing badge, such as \"By Noon\", \"By Tomorrow\", \"By Tuesday\", \"By Friday 5 PM PT\", \"Within 48 Hours\", or \"Before Partner Meeting\". Leave deadline empty only when there is no concrete or implied message-specific timeline. Keep urgency broad even when deadline is specific: a noon deadline remains urgency=today, a Tuesday or this-week deadline can remain urgency=this_week, and a next-month deadline can remain urgency=this_month. Make suggestedAction specific to the actual task and deadline, for example \"Send the report by Monday.\" or \"Complete the intake form by Friday 5 PM PT.\" Contacts must use similarly personalized nextStep values based on the actual task/deadline, not generic lane copy. Return valid JSON only matching this shape: { messages: [...], contacts: [...], sourceTypes: string[], categoryCounts: {}, messageCount: number }.",
        },
        {
          role: "user",
          content: `User goals:\n${JSON.stringify(userGoals)}\n\nRaw pasted messages:\n${rawMessages}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("LLM request failed");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM response was empty");

  return JSON.parse(content) as unknown;
}

export function normalizeAnalysisMessages(messages: AnalyzedMessage[]) {
  return messages.slice(0, 50).map((message) => ({
    ...message,
    source: normalizeSourceValue(message.source),
  }));
}

export function finalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  const messages = normalizeAnalysisMessages(result.messages);
  const categoryCounts = messages.reduce<Record<string, number>>(
    (counts, message) => {
      counts[message.category] = (counts[message.category] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return migrateAnalysisResult({
    ...result,
    messages,
    categoryCounts,
    messageCount: messages.length,
    sourceTypes: Array.from(
      new Set(messages.map((message) => message.source).filter(Boolean)),
    ),
  });
}

export async function analyzeRawMessages(
  rawMessages: string,
  userGoals: UserGoals,
) {
  const fallback = createFallbackAnalysis(rawMessages, userGoals);
  let result: AnalysisResult | null = null;
  let diagnostics: AnalysisDiagnostics;

  if (!process.env.OPENAI_API_KEY) {
    diagnostics = {
      engine: "fallback",
      model: FALLBACK_ANALYSIS_MODEL,
      openaiAttempted: false,
      fallbackReason: "missing_api_key",
    };
  } else {
    try {
      const llmResult = await analyzeWithOpenAI(rawMessages, userGoals);
      const parsed = analysisResultSchema.safeParse(llmResult);

      if (parsed.success) {
        result = parsed.data;
        diagnostics = {
          engine: "openai",
          model: ANALYSIS_MODEL,
          openaiAttempted: true,
        };
      } else {
        diagnostics = {
          engine: "fallback",
          model: FALLBACK_ANALYSIS_MODEL,
          openaiAttempted: true,
          fallbackReason: "invalid_openai_response",
        };
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "OpenAI analysis response failed schema validation",
            parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
              message: issue.message,
            })),
          );
        }
      }
    } catch {
      diagnostics = {
        engine: "fallback",
        model: FALLBACK_ANALYSIS_MODEL,
        openaiAttempted: true,
        fallbackReason: "openai_request_failed",
      };
    }
  }

  result ??= analysisResultSchema.parse(fallback);

  return finalizeAnalysisResult({
    ...result,
    analysisDiagnostics: diagnostics,
  });
}
