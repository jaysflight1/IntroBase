import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

function metricsResponse(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

type EventRow = {
  anonymous_user_id: string;
  session_id: string | null;
  event_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type BatchRow = {
  anonymous_user_id: string;
  session_id: string | null;
  message_count: number | null;
  source_types: string[] | null;
  category_counts: Record<string, number> | null;
  high_priority_count: number | null;
  medium_priority_count: number | null;
  low_priority_count: number | null;
  analysis_model: string | null;
  created_at: string;
};

function countBy<T extends string | null | undefined>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function increment(counts: Record<string, number>, key: string, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function sumMetadataNumber(events: EventRow[], eventName: string, key: string) {
  return events
    .filter((event) => event.event_name === eventName)
    .reduce((sum, event) => {
      const value = event.metadata?.[key];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
}

function inLastDays(createdAt: string, days: number) {
  return new Date(createdAt).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export async function GET(request: Request) {
  const password = request.headers.get("x-admin-password");

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return metricsResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return metricsResponse(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const [eventsResult, batchesResult, feedbackResult, emailsResult] =
    await Promise.all([
      supabase
        .from("events")
        .select("anonymous_user_id,session_id,event_name,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("message_batches")
        .select(
          "anonymous_user_id,session_id,message_count,source_types,category_counts,high_priority_count,medium_priority_count,low_priority_count,analysis_model,created_at",
        )
        .order("created_at", { ascending: false })
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
    return metricsResponse(
      { error: "Could not load metrics" },
      { status: 500 },
    );
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const batches = (batchesResult.data ?? []) as BatchRow[];
  const feedback = feedbackResult.data ?? [];
  const emails = emailsResult.data ?? [];
  const analyzedUsers = new Set(
    events
      .filter((event) => event.event_name === "analyzed_messages")
      .map((event) => event.anonymous_user_id),
  );
  const activeUsers = new Set(events.map((event) => event.anonymous_user_id));
  const sessions = new Set(
    events
      .map((event) => event.session_id)
      .filter((sessionId): sessionId is string => Boolean(sessionId)),
  );
  const batchCounts = batches.reduce<Record<string, number>>((counts, batch) => {
    counts[batch.anonymous_user_id] = (counts[batch.anonymous_user_id] ?? 0) + 1;
    return counts;
  }, {});
  const sessionCounts = events.reduce<Record<string, Set<string>>>(
    (counts, event) => {
      if (!event.session_id) return counts;
      counts[event.anonymous_user_id] ??= new Set<string>();
      counts[event.anonymous_user_id].add(event.session_id);
      return counts;
    },
    {},
  );
  const dayCounts = events.reduce<Record<string, Set<string>>>((counts, event) => {
    counts[event.anonymous_user_id] ??= new Set<string>();
    counts[event.anonymous_user_id].add(event.created_at.slice(0, 10));
    return counts;
  }, {});

  const metric = (eventName: string) =>
    events.filter((event) => event.event_name === eventName).length;
  const recentEvents = events.filter((event) => inLastDays(event.created_at, 7));
  const recentBatches = batches.filter((batch) => inLastDays(batch.created_at, 7));
  const sourceTypes = batches.reduce<Record<string, number>>((counts, batch) => {
    for (const source of batch.source_types ?? []) {
      increment(counts, source || "Unknown");
    }
    return counts;
  }, {});
  const categoryCounts = batches.reduce<Record<string, number>>(
    (counts, batch) => {
      for (const [category, count] of Object.entries(batch.category_counts ?? {})) {
        increment(counts, category, Number(count) || 0);
      }
      return counts;
    },
    {},
  );
  const analysisModels = countBy(batches.map((batch) => batch.analysis_model));
  const openAiRuns = events.filter(
    (event) =>
      event.event_name === "analyzed_messages" &&
      event.metadata?.analysis_engine === "openai",
  ).length;
  const fallbackRuns = events.filter(
    (event) =>
      event.event_name === "analyzed_messages" &&
      event.metadata?.analysis_engine === "fallback",
  ).length;
  const submittedMessages = sumMetadataNumber(
    events,
    "submitted_messages",
    "message_count",
  );
  const sampleMessagesLoaded = sumMetadataNumber(
    events,
    "used_sample_inbox",
    "message_count",
  );
  const totalMessages = batches.reduce(
    (sum, batch) => sum + (batch.message_count ?? 0),
    0,
  );

  const wouldUseAgain = countBy(feedback.map((item) => item.would_use_again));
  const willingnessToPay = countBy(
    feedback.map((item) => item.willingness_to_pay),
  );
  const usefulRatings = countBy(feedback.map((item) => item.usefulness_rating));
  const willingPaid = feedback.filter(
    (item) =>
      item.willingness_to_pay &&
      !["$0", "I would not pay", "Maybe"].includes(item.willingness_to_pay),
  ).length;

  return metricsResponse({
    uniqueActiveUsers: activeUsers.size,
    uniqueAnalyzedUsers: analyzedUsers.size,
    totalSessions: sessions.size,
    repeatSessionUsers: Object.values(sessionCounts).filter(
      (userSessions) => userSessions.size > 1,
    ).length,
    totalBatches: batches.length,
    totalMessages,
    submittedMessages,
    importMessagesCreated:
      metric("created_import_message") + sampleMessagesLoaded,
    importMessagesDeleted: metric("deleted_import_message"),
    importMessagesRequeued: metric("requeued_import_message"),
    repeatBatchUsers: Object.values(batchCounts).filter((count) => count > 1)
      .length,
    laterDayReturningUsers: Object.values(dayCounts).filter(
      (days) => days.size > 1,
    ).length,
    activeUsersLast7Days: new Set(
      recentEvents.map((event) => event.anonymous_user_id),
    ).size,
    messagesAnalyzedLast7Days: recentBatches.reduce(
      (sum, batch) => sum + (batch.message_count ?? 0),
      0,
    ),
    analysisFailures: metric("analysis_failed"),
    openAiRuns,
    fallbackRuns,
    repliesCopied: metric("copied_reply"),
    contactsSaved: metric("saved_contact"),
    contactsStarred: metric("starred_contact"),
    contactNotesSaved: metric("saved_contact_note"),
    followupsCreated: metric("created_followup"),
    messageCardsOpened: metric("opened_message"),
    priorityChanges: metric("changed_priority"),
    messagesReordered: metric("reordered_message"),
    messagesDeleted: metric("deleted_message"),
    deadlinesEdited: metric("edited_deadline"),
    suggestedRepliesEdited: metric("edited_suggested_reply"),
    feedbackResponses: feedback.length,
    emailsCollected: emails.length,
    sourceTypes,
    categoryCounts,
    priorityCounts: {
      high: batches.reduce(
        (sum, batch) => sum + (batch.high_priority_count ?? 0),
        0,
      ),
      medium: batches.reduce(
        (sum, batch) => sum + (batch.medium_priority_count ?? 0),
        0,
      ),
      low: batches.reduce(
        (sum, batch) => sum + (batch.low_priority_count ?? 0),
        0,
      ),
    },
    analysisModels,
    usefulRatings,
    wouldUseAgain,
    willingnessToPay,
    willingPaid,
  });
}
