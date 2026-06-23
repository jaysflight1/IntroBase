import { NextResponse } from "next/server";

import { analyzePayloadSchema } from "@/lib/apiSchemas";
import { analyzeRawMessages } from "@/lib/analysis/run";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
    const normalized = await analyzeRawMessages(raw_messages, user_goals);
    const messages = normalized.messages;
    const diagnostics = normalized.analysisDiagnostics;

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
        analysis_model: diagnostics?.model ?? "unknown",
      });
    }

    await logServerEvent("analyzed_messages", anonymous_user_id, session_id, {
      message_count: normalized.messageCount,
      source_types: normalized.sourceTypes,
      high_priority_count: priorityCounts.high,
      medium_priority_count: priorityCounts.medium,
      low_priority_count: priorityCounts.low,
      analysis_engine: diagnostics?.engine ?? "unknown",
      analysis_model: diagnostics?.model ?? "unknown",
      openai_attempted: diagnostics?.openaiAttempted ?? false,
      fallback_reason: diagnostics?.fallbackReason ?? null,
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
