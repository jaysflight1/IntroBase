import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeRawMessages } from "@/lib/analysis/run";
import {
  getGmailMessage,
  listRecentInboxMessageIds,
  watchGmailInbox,
} from "@/lib/integrations/gmail/api";
import { normalizeGmailMessage } from "@/lib/integrations/gmail/parser";
import { refreshGmailAccessToken } from "@/lib/integrations/gmail/oauth";
import { decryptToken, encryptToken } from "@/lib/security/tokenCrypto";
import type { AnalyzedMessage, UserGoals } from "@/types";
import type { NormalizedSourceMessage } from "@/types/integrations";

const DEFAULT_GOALS: UserGoals = {
  prioritize: [
    "Investors",
    "Customers/users",
    "Collaborators",
    "Applications/deadlines",
  ],
  context: "I am a founder/builder trying to avoid missing important opportunities.",
};

interface ConnectedAccountRow {
  id: string;
  user_id: string;
  provider_account_email: string | null;
  refresh_token_encrypted: string | null;
  status: string;
}

interface SourceMessageRow {
  id: string;
  external_message_id: string;
  source_label: string;
  sender_name: string;
  sender_organization: string | null;
  subject: string | null;
  body_text: string;
  source_context: Record<string, unknown>;
  received_at: string;
}

function serializeForAnalysis(message: SourceMessageRow) {
  return [
    "Source: Gmail",
    `From: ${message.sender_name}`,
    message.subject ? `Subject: ${message.subject}` : "",
    `Message: ${message.body_text}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function mapAnalysisForInsert(
  userId: string,
  sourceMessage: SourceMessageRow,
  analyzed: AnalyzedMessage,
) {
  return {
    user_id: userId,
    source_message_id: sourceMessage.id,
    provider: "gmail",
    source_context: sourceMessage.source_context,
    sender_name: analyzed.senderName || sourceMessage.sender_name,
    sender_organization:
      analyzed.senderOrganization || sourceMessage.sender_organization || "",
    sender_role: analyzed.senderRole || "",
    source: "Gmail",
    original_text: analyzed.originalText || sourceMessage.body_text,
    summary: analyzed.summary,
    category: analyzed.category,
    priority: analyzed.priority,
    urgency: analyzed.urgency,
    priority_score: Math.round(analyzed.priorityScore),
    deadline: analyzed.deadline || "",
    suggested_action: analyzed.suggestedAction,
    suggested_reply: analyzed.suggestedReply,
    why_it_matters: analyzed.whyItMatters,
    follow_up_date: analyzed.followUpDate || "",
    contact_tags: analyzed.contactTags,
    status: analyzed.status,
    received_at: sourceMessage.received_at,
    updated_at: new Date().toISOString(),
  };
}

async function markAccount(
  supabase: SupabaseClient,
  accountId: string,
  patch: Record<string, unknown>,
) {
  await supabase
    .from("connected_accounts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", accountId);
}

async function getFreshAccessToken(
  supabase: SupabaseClient,
  account: ConnectedAccountRow,
) {
  if (!account.refresh_token_encrypted) {
    await markAccount(supabase, account.id, {
      status: "reauth_required",
      last_error: "Gmail refresh token is missing. Reconnect Gmail.",
    });
    throw new Error("Gmail refresh token missing");
  }

  const refreshed = await refreshGmailAccessToken(
    decryptToken(account.refresh_token_encrypted),
  ).catch(async (error) => {
    await markAccount(supabase, account.id, {
      status: "reauth_required",
      last_error: "Google access expired. Reconnect Gmail.",
    });
    throw error;
  });

  await markAccount(supabase, account.id, {
    access_token_encrypted: encryptToken(refreshed.access_token),
    token_expires_at: refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : null,
  });

  return refreshed.access_token;
}

async function insertNormalizedMessages(
  supabase: SupabaseClient,
  messages: NormalizedSourceMessage[],
) {
  if (!messages.length) return;

  await supabase.from("source_messages").upsert(
    messages.map((message) => ({
      user_id: message.userId,
      connected_account_id: message.connectedAccountId,
      provider: message.provider,
      external_message_id: message.externalMessageId,
      external_thread_id: message.externalThreadId ?? "",
      source_url: message.sourceUrl ?? "",
      sender_name: message.senderName,
      sender_email: message.senderEmail ?? "",
      sender_handle: message.senderHandle ?? "",
      sender_organization: message.organization ?? "",
      source_label: message.sourceLabel,
      source_context: message.sourceContext,
      subject: message.subject ?? "",
      body_text: message.bodyText,
      received_at: message.receivedAt,
      raw_metadata: message.rawMetadata,
      analysis_status: "pending",
    })),
    {
      onConflict: "connected_account_id,external_message_id",
      ignoreDuplicates: true,
    },
  );
}

async function analyzePendingMessages(
  supabase: SupabaseClient,
  account: ConnectedAccountRow,
) {
  const { data: pending, error } = await supabase
    .from("source_messages")
    .select(
      "id, external_message_id, source_label, sender_name, sender_organization, subject, body_text, source_context, received_at",
    )
    .eq("connected_account_id", account.id)
    .eq("analysis_status", "pending")
    .order("received_at", { ascending: false })
    .limit(25)
    .returns<SourceMessageRow[]>();

  if (error) {
    throw error;
  }

  if (!pending?.length) {
    return 0;
  }

  await supabase
    .from("source_messages")
    .update({ analysis_status: "processing" })
    .in(
      "id",
      pending.map((message) => message.id),
    );

  try {
    const rawMessages = pending.map(serializeForAnalysis).join("\n\n");
    const analysis = await analyzeRawMessages(rawMessages, DEFAULT_GOALS);
    const rows = pending
      .map((sourceMessage, index) => {
        const analyzed = analysis.messages[index];
        return analyzed
          ? mapAnalysisForInsert(account.user_id, sourceMessage, analyzed)
          : null;
      })
      .filter((row) => row !== null);

    if (rows.length) {
      await supabase.from("analyzed_messages").upsert(rows, {
        onConflict: "user_id,source_message_id",
      });
    }

    const analyzedIds = new Set(rows.map((row) => row.source_message_id));
    const analyzedSourceIds = pending
      .filter((message) => analyzedIds.has(message.id))
      .map((message) => message.id);
    const failedSourceIds = pending
      .filter((message) => !analyzedIds.has(message.id))
      .map((message) => message.id);

    if (analyzedSourceIds.length) {
      await supabase
        .from("source_messages")
        .update({ analysis_status: "analyzed", analysis_error: null })
        .in("id", analyzedSourceIds);
    }

    if (failedSourceIds.length) {
      await supabase
        .from("source_messages")
        .update({
          analysis_status: "failed",
          analysis_error: "Analysis did not return a result for this message.",
        })
        .in("id", failedSourceIds);
    }

    return rows.length;
  } catch (error) {
    await supabase
      .from("source_messages")
      .update({
        analysis_status: "failed",
        analysis_error:
          error instanceof Error ? error.message : "Message analysis failed.",
      })
      .in(
        "id",
        pending.map((message) => message.id),
      );
    throw error;
  }
}

export async function syncGmailAccount(
  supabase: SupabaseClient,
  account: ConnectedAccountRow,
) {
  if (account.status === "disconnected") {
    return { importedCount: 0, analyzedCount: 0 };
  }

  try {
    await markAccount(supabase, account.id, {
      last_sync_at: new Date().toISOString(),
      last_error: null,
    });

    const accessToken = await getFreshAccessToken(supabase, account);
    const accountEmail = account.provider_account_email ?? "Gmail";
    const messageIds = await listRecentInboxMessageIds(accessToken);
    const gmailMessages = await Promise.all(
      messageIds.map((id) => getGmailMessage(accessToken, id)),
    );

    const normalized = gmailMessages.map((message) =>
      normalizeGmailMessage({
        userId: account.user_id,
        connectedAccountId: account.id,
        accountEmail,
        message,
      }),
    );

    await insertNormalizedMessages(supabase, normalized);
    const analyzedCount = await analyzePendingMessages(supabase, account);
    const watch = await watchGmailInbox(accessToken).catch(() => null);

    if (watch?.historyId) {
      await supabase.from("sync_cursors").upsert(
        {
          connected_account_id: account.id,
          provider: "gmail",
          cursor_type: "gmail_history_id",
          cursor_value: watch.historyId,
          expires_at: watch.expiration
            ? new Date(Number(watch.expiration)).toISOString()
            : null,
          metadata: { watchRegisteredAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "connected_account_id,cursor_type" },
      );
    }

    await markAccount(supabase, account.id, {
      status: "connected",
      last_successful_sync_at: new Date().toISOString(),
      last_error: null,
    });

    return { importedCount: normalized.length, analyzedCount };
  } catch (error) {
    const needsReconnect =
      error instanceof Error && error.message.includes("token refresh");

    await markAccount(supabase, account.id, {
      status: needsReconnect ? "reauth_required" : "sync_error",
      last_error:
        needsReconnect
          ? "Google access expired. Reconnect Gmail."
          : error instanceof Error
          ? error.message
          : "Gmail sync failed. Try reconnecting Gmail.",
    });
    throw error;
  }
}

export async function syncPrimaryGmailAccount(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select("id, user_id, provider_account_email, refresh_token_encrypted, status")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<ConnectedAccountRow>();

  if (error) {
    throw error;
  }

  if (!account) {
    return null;
  }

  return syncGmailAccount(supabase, account);
}
