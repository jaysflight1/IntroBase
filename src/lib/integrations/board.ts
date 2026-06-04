import type { SupabaseClient } from "@supabase/supabase-js";

import type { AnalysisResult, AnalyzedMessage } from "@/types";

interface AnalyzedMessageRow {
  id: string;
  source_message_id: string;
  provider: string;
  sender_name: string;
  sender_organization: string | null;
  sender_role: string | null;
  source: string;
  original_text: string;
  summary: string;
  category: AnalyzedMessage["category"];
  priority: AnalyzedMessage["priority"];
  urgency: AnalyzedMessage["urgency"];
  priority_score: number;
  deadline: string | null;
  suggested_action: string;
  suggested_reply: string;
  why_it_matters: string;
  follow_up_date: string | null;
  contact_tags: string[] | null;
  status: AnalyzedMessage["status"];
  received_at: string;
}

function toAnalyzedMessage(row: AnalyzedMessageRow): AnalyzedMessage {
  return {
    id: row.id,
    source: row.source,
    senderName: row.sender_name,
    senderOrganization: row.sender_organization ?? "",
    senderRole: row.sender_role ?? "",
    originalText: row.original_text,
    summary: row.summary,
    category: row.category,
    priority: row.priority,
    urgency: row.urgency,
    priorityScore: row.priority_score,
    deadline: row.deadline ?? "",
    suggestedAction: row.suggested_action,
    suggestedReply: row.suggested_reply,
    whyItMatters: row.why_it_matters,
    followUpDate: row.follow_up_date ?? "",
    contactTags: row.contact_tags ?? [],
    status: row.status,
  };
}

export async function getServerAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AnalysisResult> {
  const { data, error } = await supabase
    .from("analyzed_messages")
    .select(
      "id, source_message_id, provider, sender_name, sender_organization, sender_role, source, original_text, summary, category, priority, urgency, priority_score, deadline, suggested_action, suggested_reply, why_it_matters, follow_up_date, contact_tags, status, received_at",
    )
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(100)
    .returns<AnalyzedMessageRow[]>();

  if (error) {
    throw error;
  }

  const messages = (data ?? []).map(toAnalyzedMessage);
  const categoryCounts = messages.reduce<Record<string, number>>(
    (counts, message) => {
      counts[message.category] = (counts[message.category] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    messages,
    contacts: [],
    sourceTypes: Array.from(new Set(messages.map((message) => message.source))),
    categoryCounts,
    messageCount: messages.length,
  };
}
