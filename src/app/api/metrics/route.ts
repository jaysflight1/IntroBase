import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

function countBy<T extends string | null | undefined>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export async function GET(request: Request) {
  const password = request.headers.get("x-admin-password");

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const [eventsResult, batchesResult, feedbackResult, emailsResult] =
    await Promise.all([
      supabase
        .from("events")
        .select("anonymous_user_id,event_name,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("message_batches")
        .select("anonymous_user_id,message_count,created_at")
        .limit(5000),
      supabase
        .from("feedback")
        .select("usefulness_rating,would_use_again,willingness_to_pay")
        .limit(5000),
      supabase.from("email_signups").select("id").limit(5000),
    ]);

  if (
    eventsResult.error ||
    batchesResult.error ||
    feedbackResult.error ||
    emailsResult.error
  ) {
    return NextResponse.json(
      { error: "Could not load metrics" },
      { status: 500 },
    );
  }

  const events = eventsResult.data ?? [];
  const batches = batchesResult.data ?? [];
  const feedback = feedbackResult.data ?? [];
  const emails = emailsResult.data ?? [];
  const analyzedUsers = new Set(
    events
      .filter((event) => event.event_name === "analyzed_messages")
      .map((event) => event.anonymous_user_id),
  );
  const activeUsers = new Set(events.map((event) => event.anonymous_user_id));
  const batchCounts = batches.reduce<Record<string, number>>((counts, batch) => {
    counts[batch.anonymous_user_id] = (counts[batch.anonymous_user_id] ?? 0) + 1;
    return counts;
  }, {});
  const dayCounts = events.reduce<Record<string, Set<string>>>((counts, event) => {
    counts[event.anonymous_user_id] ??= new Set<string>();
    counts[event.anonymous_user_id].add(event.created_at.slice(0, 10));
    return counts;
  }, {});

  const metric = (eventName: string) =>
    events.filter((event) => event.event_name === eventName).length;

  const wouldUseAgain = countBy(feedback.map((item) => item.would_use_again));
  const willingnessToPay = countBy(
    feedback.map((item) => item.willingness_to_pay),
  );
  const usefulRatings = countBy(feedback.map((item) => item.usefulness_rating));
  const willingPaid = feedback.filter(
    (item) =>
      item.willingness_to_pay &&
      !["I would not pay", "Maybe"].includes(item.willingness_to_pay),
  ).length;

  return NextResponse.json({
    uniqueActiveUsers: activeUsers.size,
    uniqueAnalyzedUsers: analyzedUsers.size,
    totalBatches: batches.length,
    totalMessages: batches.reduce(
      (sum, batch) => sum + (batch.message_count ?? 0),
      0,
    ),
    repeatBatchUsers: Object.values(batchCounts).filter((count) => count > 1)
      .length,
    laterDayReturningUsers: Object.values(dayCounts).filter(
      (days) => days.size > 1,
    ).length,
    repliesCopied: metric("copied_reply"),
    contactsSaved: metric("saved_contact"),
    followupsCreated: metric("created_followup"),
    messageCardsOpened: metric("opened_message"),
    priorityChanges: metric("changed_priority"),
    feedbackResponses: feedback.length,
    emailsCollected: emails.length,
    usefulRatings,
    wouldUseAgain,
    willingnessToPay,
    willingPaid,
  });
}
