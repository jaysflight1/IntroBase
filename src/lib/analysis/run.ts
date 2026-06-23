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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Introbase, an AI system that turns messy pasted inbound messages into a structured reply inbox for founders and busy builders. Assign each message exactly one urgency timing: today (reply today), this_week (reply this week), this_month (reply this month), later (low urgency), or ignore. Also set priority to match timing: today=high, this_week=medium, this_month=medium, later=low, ignore=low. Prioritize opportunity value, time sensitivity, relationship importance, specific asks or deadlines, and relevance to the user's goals. Do not over-rank generic spam, newsletters, vague sales pitches, or low-effort messages. Use today sparingly: for a normal 10-20 message batch, aim for roughly 5-7 today items unless true urgency clearly requires more. Carefully scan every message for specific dates, weekdays, times, or timelines: examples include \"by noon\", \"tomorrow\", \"by Tuesday\", \"Friday at 5 PM PT\", \"next week\", \"within 48 hours\", \"before the partner meeting\", \"due Monday\", and concrete calendar dates. If any specific date/timeline affects when the user should act, reflect it in the message's deadline field as a short user-facing badge, such as \"By Noon\", \"By Tomorrow\", \"By Tuesday\", \"By Friday 5 PM PT\", \"Within 48 Hours\", or \"Before Partner Meeting\". Leave deadline empty only when there is no concrete or implied message-specific timeline. Keep urgency broad even when deadline is specific: a noon deadline remains urgency=today, a Tuesday or this-week deadline can remain urgency=this_week, and a next-month deadline can remain urgency=this_month. Make suggestedAction specific to the actual task and deadline, for example \"Send the report by Monday.\" or \"Complete the intake form by Friday 5 PM PT.\" Contacts must use similarly personalized nextStep values based on the actual task/deadline, not generic lane copy. Return valid JSON only matching this shape: { messages: [...], contacts: [...], sourceTypes: string[], categoryCounts: {}, messageCount: number }.",
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
