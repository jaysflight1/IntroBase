import { NextResponse } from "next/server";

import {
  analysisResultSchema,
  analyzePayloadSchema,
} from "@/lib/apiSchemas";
import { createFallbackAnalysis } from "@/lib/analysis/fallback";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const MODEL = "gpt-4.1-mini";

async function logServerEvent(
  eventName: string,
  anonymousUserId: string,
  sessionId: string | null | undefined,
  metadata: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("events").insert({
    anonymous_user_id: anonymousUserId,
    session_id: sessionId,
    event_name: eventName,
    metadata,
  });
}

async function isRateLimited(anonymousUserId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("message_batches")
    .select("id", { count: "exact", head: true })
    .eq("anonymous_user_id", anonymousUserId)
    .gte("created_at", oneHourAgo);

  if (error) return false;
  return (count ?? 0) >= 5;
}

async function analyzeWithOpenAI(rawMessages: string, userGoals: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Introbase, an AI system that turns messy pasted inbound messages into a structured priority inbox for founders and busy builders. Prioritize opportunity value, time sensitivity, relationship importance, specific asks or deadlines, and relevance to the user's goals. Do not over-rank generic spam, newsletters, vague sales pitches, or low-effort messages. Return valid JSON only matching this shape: { messages: [...], contacts: [...], sourceTypes: string[], categoryCounts: {}, messageCount: number }.",
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

export async function POST(request: Request) {
  const parsed = analyzePayloadSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "This batch is too large for the beta. Try pasting 5 to 30 messages at a time." },
      { status: 400 },
    );
  }

  const { anonymous_user_id, session_id, raw_messages, user_goals } =
    parsed.data;

  if (await isRateLimited(anonymous_user_id)) {
    return NextResponse.json(
      { error: "You have reached the beta analysis limit. Try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const llmResult = await analyzeWithOpenAI(raw_messages, user_goals).catch(
      () => null,
    );
    const fallback = createFallbackAnalysis(raw_messages, user_goals);
    const result = analysisResultSchema.parse(llmResult ?? fallback);
    const messages = result.messages.slice(0, 50);
    const categoryCounts = messages.reduce<Record<string, number>>(
      (counts, message) => {
        counts[message.category] = (counts[message.category] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const normalized = {
      ...result,
      messages,
      categoryCounts,
      messageCount: messages.length,
      sourceTypes: Array.from(new Set(messages.map((message) => message.source))),
    };

    const priorityCounts = messages.reduce(
      (counts, message) => {
        counts[message.priority] += 1;
        return counts;
      },
      { high: 0, medium: 0, low: 0 },
    );

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("message_batches").insert({
        anonymous_user_id,
        session_id,
        message_count: normalized.messageCount,
        source_types: normalized.sourceTypes,
        category_counts: normalized.categoryCounts,
        high_priority_count: priorityCounts.high,
        medium_priority_count: priorityCounts.medium,
        low_priority_count: priorityCounts.low,
        analysis_model: process.env.OPENAI_API_KEY ? MODEL : "local_fallback",
      });
    }

    await logServerEvent("analyzed_messages", anonymous_user_id, session_id, {
      message_count: normalized.messageCount,
      source_types: normalized.sourceTypes,
      high_priority_count: priorityCounts.high,
      medium_priority_count: priorityCounts.medium,
      low_priority_count: priorityCounts.low,
    });

    return NextResponse.json(normalized);
  } catch {
    await logServerEvent("analysis_failed", anonymous_user_id, session_id, {
      character_count: raw_messages.length,
    });

    return NextResponse.json(
      {
        error:
          "Introbase could not analyze this batch. Try pasting fewer messages or using a clearer format.",
      },
      { status: 500 },
    );
  }
}
