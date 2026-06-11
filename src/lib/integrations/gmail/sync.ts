import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeRawMessages } from "@/lib/analysis/run";
import {
  GmailApiError,
  getGmailMessage,
  listInboxHistoryMessageIds,
  listRecentInboxMessageIds,
  watchGmailInbox,
} from "@/lib/integrations/gmail/api";
import {
  applyGmailPriorityLabel,
  getOrEnsureGmailPriorityLabels,
  hasGmailModifyScope,
} from "@/lib/integrations/gmail/labels";
import { normalizeGmailMessage } from "@/lib/integrations/gmail/parser";
import { refreshGmailAccessToken } from "@/lib/integrations/gmail/oauth";
import { decryptToken, encryptToken } from "@/lib/security/tokenCrypto";
import type { AnalyzedMessage, Priority, UserGoals } from "@/types";
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

export interface GmailConnectedAccountRow {
  id: string;
  user_id: string;
  provider_account_email: string | null;
  refresh_token_encrypted: string | null;
  scopes?: string[] | null;
  status: string;
  metadata?: Record<string, unknown> | null;
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
  account: GmailConnectedAccountRow,
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
  account: GmailConnectedAccountRow,
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
    return { analyzedCount: 0, labelTargets: [] };
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

    return {
      analyzedCount: rows.length,
      labelTargets: pending
        .map((sourceMessage, index) => {
          const analyzed = analysis.messages[index];

          if (!analyzed) return null;

          return {
            externalMessageId: sourceMessage.external_message_id,
            priority: analyzed.priority,
          };
        })
        .filter(
          (
            target,
          ): target is { externalMessageId: string; priority: Priority } =>
            target !== null,
        ),
    };
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

async function applyPriorityLabels(
  supabase: SupabaseClient,
  account: GmailConnectedAccountRow,
  accessToken: string,
  targets: { externalMessageId: string; priority: Priority }[],
) {
  if (!targets.length) {
    return 0;
  }

  if (!hasGmailModifyScope(account.scopes)) {
    await markAccount(supabase, account.id, {
      status: "reauth_required",
      last_error:
        "Reconnect Gmail to allow IntroBase to apply priority labels.",
    });
    return 0;
  }

  const labelIds = await getOrEnsureGmailPriorityLabels({
    supabase,
    accountId: account.id,
    accessToken,
    metadata: account.metadata,
  });

  let labeledCount = 0;

  for (const target of targets) {
    await applyGmailPriorityLabel({
      accessToken,
      messageId: target.externalMessageId,
      priority: target.priority,
      labelIds,
    });
    labeledCount += 1;
  }

  return labeledCount;
}

async function upsertHistoryCursor(
  supabase: SupabaseClient,
  accountId: string,
  historyId: string,
  expiresAt?: string | null,
) {
  await supabase.from("sync_cursors").upsert(
    {
      connected_account_id: accountId,
      provider: "gmail",
      cursor_type: "gmail_history_id",
      cursor_value: historyId,
      expires_at: expiresAt ?? null,
      metadata: { updatedBy: "gmail_sync", updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connected_account_id,cursor_type" },
  );
}

async function getHistoryCursor(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("sync_cursors")
    .select("cursor_value")
    .eq("connected_account_id", accountId)
    .eq("cursor_type", "gmail_history_id")
    .maybeSingle<{ cursor_value: string }>();

  if (error) {
    throw error;
  }

  return data?.cursor_value ?? null;
}

async function importAndAnalyzeMessages(
  supabase: SupabaseClient,
  account: GmailConnectedAccountRow,
  accessToken: string,
  messageIds: string[],
) {
  const accountEmail = account.provider_account_email ?? "Gmail";
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
  const analysis = await analyzePendingMessages(supabase, account);
  let labeledCount = 0;

  try {
    labeledCount = await applyPriorityLabels(
      supabase,
      account,
      accessToken,
      analysis.labelTargets,
    );
  } catch (error) {
    await markAccount(supabase, account.id, {
      last_error:
        error instanceof Error
          ? `Gmail priority labeling failed: ${error.message}`
          : "Gmail priority labeling failed.",
    });
  }

  return {
    importedCount: normalized.length,
    analyzedCount: analysis.analyzedCount,
    labeledCount,
  };
}

export async function renewGmailWatchForAccount(
  supabase: SupabaseClient,
  account: GmailConnectedAccountRow,
) {
  if (account.status === "disconnected") {
    return { renewed: false };
  }

  const accessToken = await getFreshAccessToken(supabase, account);
  const watch = await watchGmailInbox(accessToken);

  if (watch?.historyId) {
    await upsertHistoryCursor(
      supabase,
      account.id,
      watch.historyId,
      watch.expiration ? new Date(Number(watch.expiration)).toISOString() : null,
    );
  }

  await markAccount(supabase, account.id, {
    status: "connected",
    last_error: null,
  });

  return { renewed: true, historyId: watch?.historyId ?? null };
}

export async function syncGmailAccount(
  supabase: SupabaseClient,
  account: GmailConnectedAccountRow,
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
    const messageIds = await listRecentInboxMessageIds(accessToken);
    const result = await importAndAnalyzeMessages(
      supabase,
      account,
      accessToken,
      messageIds,
    );
    const watch = await watchGmailInbox(accessToken).catch(() => null);

    if (watch?.historyId) {
      await upsertHistoryCursor(
        supabase,
        account.id,
        watch.historyId,
        watch.expiration ? new Date(Number(watch.expiration)).toISOString() : null,
      );
    }

    await markAccount(supabase, account.id, {
      status: "connected",
      last_successful_sync_at: new Date().toISOString(),
      last_error: null,
    });

    return result;
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

export async function syncGmailIncrementalAccount(
  supabase: SupabaseClient,
  account: GmailConnectedAccountRow,
  notificationHistoryId?: string | null,
) {
  if (account.status === "disconnected") {
    return { importedCount: 0, analyzedCount: 0, fallbackFullSync: false };
  }

  const cursor = await getHistoryCursor(supabase, account.id);

  if (!cursor) {
    return { ...(await syncGmailAccount(supabase, account)), fallbackFullSync: true };
  }

  try {
    await markAccount(supabase, account.id, {
      last_sync_at: new Date().toISOString(),
      last_error: null,
    });

    const accessToken = await getFreshAccessToken(supabase, account);
    const history = await listInboxHistoryMessageIds(accessToken, cursor);
    const result = await importAndAnalyzeMessages(
      supabase,
      account,
      accessToken,
      history.messageIds,
    );
    const nextCursor = notificationHistoryId ?? history.historyId;

    if (nextCursor) {
      await upsertHistoryCursor(supabase, account.id, nextCursor);
    }

    await markAccount(supabase, account.id, {
      status: "connected",
      last_successful_sync_at: new Date().toISOString(),
      last_error: null,
    });

    return { ...result, fallbackFullSync: false };
  } catch (error) {
    if (error instanceof GmailApiError && error.status === 404) {
      return { ...(await syncGmailAccount(supabase, account)), fallbackFullSync: true };
    }

    await markAccount(supabase, account.id, {
      status: "sync_error",
      last_error:
        error instanceof Error
          ? error.message
          : "Gmail incremental sync failed.",
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
    .select(
      "id, user_id, provider_account_email, refresh_token_encrypted, scopes, status, metadata",
    )
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<GmailConnectedAccountRow>();

  if (error) {
    throw error;
  }

  if (!account) {
    return null;
  }

  return syncGmailAccount(supabase, account);
}

export async function applyPriorityLabelsForPrimaryGmailAccount(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select(
      "id, user_id, provider_account_email, refresh_token_encrypted, scopes, status, metadata",
    )
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<GmailConnectedAccountRow>();

  if (error) {
    throw error;
  }

  if (!account) {
    return null;
  }

  if (!hasGmailModifyScope(account.scopes)) {
    await markAccount(supabase, account.id, {
      status: "reauth_required",
      last_error:
        "Reconnect Gmail to allow IntroBase to apply priority labels.",
    });
    return { labeledCount: 0, reconnectRequired: true };
  }

  const accessToken = await getFreshAccessToken(supabase, account);
  const { data: analyzed, error: analyzedError } = await supabase
    .from("analyzed_messages")
    .select("source_message_id, priority")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .order("received_at", { ascending: false })
    .limit(100)
    .returns<{ source_message_id: string; priority: Priority }[]>();

  if (analyzedError) {
    throw analyzedError;
  }

  if (!analyzed?.length) {
    return { labeledCount: 0, reconnectRequired: false };
  }

  const sourceIds = analyzed.map((message) => message.source_message_id);
  const { data: sources, error: sourceError } = await supabase
    .from("source_messages")
    .select("id, external_message_id")
    .eq("connected_account_id", account.id)
    .in("id", sourceIds)
    .returns<{ id: string; external_message_id: string }[]>();

  if (sourceError) {
    throw sourceError;
  }

  const externalMessageIdsBySourceId = new Map(
    (sources ?? []).map((source) => [source.id, source.external_message_id]),
  );
  const targets = analyzed
    .map((message) => {
      const externalMessageId = externalMessageIdsBySourceId.get(
        message.source_message_id,
      );

      return externalMessageId
        ? { externalMessageId, priority: message.priority }
        : null;
    })
    .filter(
      (target): target is { externalMessageId: string; priority: Priority } =>
        target !== null,
    );

  const labeledCount = await applyPriorityLabels(
    supabase,
    account,
    accessToken,
    targets,
  );

  await markAccount(supabase, account.id, {
    status: "connected",
    last_error: null,
  });

  return { labeledCount, reconnectRequired: false };
}
