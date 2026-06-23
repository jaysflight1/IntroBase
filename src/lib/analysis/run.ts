import { analysisResultSchema } from "@/lib/apiSchemas";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { normalizeSourceValue } from "@/lib/normalizeSource";
import { migrateAnalysisResult } from "@/lib/replyTiming";
import type { AnalysisResult, AnalyzedMessage, UserGoals } from "@/types";

export const ANALYSIS_MODEL = "gpt-4.1-mini";

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
            "You are Introbase, an AI system that turns messy pasted inbound messages into a structured reply inbox for founders and busy builders. Assign each message exactly one urgency timing: today (reply today), this_week (reply this week), this_month (reply this month), later (low urgency), or ignore. Also set priority to match timing: today=high, this_week=medium, this_month=medium, later=low, ignore=low. Prioritize opportunity value, time sensitivity, relationship importance, specific asks or deadlines, and relevance to the user's goals. Do not over-rank generic spam, newsletters, vague sales pitches, or low-effort messages. Use today sparingly: for a normal 10-20 message batch, aim for roughly 5-7 today items unless true urgency clearly requires more. When a message contains an explicit deadline or requested time, put a short user-facing badge in deadline, such as \"By Noon\", \"By Tuesday\", or \"By Friday 5 PM PT\". Leave deadline empty when there is no concrete message-specific deadline. Keep urgency broad even when deadline is specific: a noon deadline remains urgency=today, a Tuesday deadline can remain urgency=this_week. Make suggestedAction specific to the task and deadline, for example \"Send the report by Monday.\" or \"Complete the intake form by Friday 5 PM PT.\" Contacts must use similarly personalized nextStep values based on the actual task/deadline, not generic lane copy. Return valid JSON only matching this shape: { messages: [...], contacts: [...], sourceTypes: string[], categoryCounts: {}, messageCount: number }.",
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
  const llmResult = await analyzeWithOpenAI(rawMessages, userGoals).catch(
    () => null,
  );
  const fallback = createFallbackAnalysis(rawMessages, userGoals);
  const result = analysisResultSchema.parse(llmResult ?? fallback);

  return finalizeAnalysisResult(result);
}
