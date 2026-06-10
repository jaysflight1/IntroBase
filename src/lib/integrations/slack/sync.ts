import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeRawMessages } from "@/lib/analysis/run";
import {
  getSlackConversationHistory,
  getSlackConversationInfo,
  getSlackUserInfo,
  listSlackConversations,
} from "@/lib/integrations/slack/api";
import { normalizeSlackMessage } from "@/lib/integrations/slack/parser";
import type {
  SlackConversation,
  SlackMessageEvent,
  SlackUser,
} from "@/lib/integrations/slack/types";
import { decryptToken } from "@/lib/security/tokenCrypto";
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

export interface SlackConnectedAccountRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  access_token_encrypted: string | null;
  status: string;
}

interface SourceMessageRow {
  id: string;
  source_label: string;
  sender_name: string;
  sender_organization: string | null;
  body_text: string;
  source_context: Record<string, unknown>;
  received_at: string;
}

function serializeForAnalysis(message: SourceMessageRow) {
  const channel =
    typeof message.source_context.slackConversationLabel === "string"
      ? message.source_context.slackConversationLabel
      : message.source_label;

  return [
    `Source: ${message.source_label}`,
    `From: ${message.sender_name}`,
    `Channel: ${channel}`,
    `Message: ${message.body_text}`,
  ].join("\n");
}

function mapAnalysisForInsert(
  userId: string,
  sourceMessage: SourceMessageRow,
  analyzed: AnalyzedMessage,
) {
  return {
    user_id: userId,
    source_message_id: sourceMessage.id,
    provider: "slack",
    source_context: sourceMessage.source_context,
    sender_name: analyzed.senderName || sourceMessage.sender_name,
    sender_organization:
      analyzed.senderOrganization || sourceMessage.sender_organization || "",
    sender_role: analyzed.senderRole || "",
    source: sourceMessage.source_label,
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

function getAccessToken(account: SlackConnectedAccountRow) {
  if (!account.access_token_encrypted) {
    throw new Error("Slack access token missing. Reconnect Slack.");
  }

  return decryptToken(account.access_token_encrypted);
}

async function insertNormalizedMessages(
  supabase: SupabaseClient,
  messages: NormalizedSourceMessage[],
  options?: { ignoreDuplicates?: boolean },
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
      ignoreDuplicates: options?.ignoreDuplicates ?? true,
    },
  );
}

async function analyzePendingMessages(
  supabase: SupabaseClient,
  account: SlackConnectedAccountRow,
) {
  const { data: pending, error } = await supabase
    .from("source_messages")
    .select(
      "id, source_label, sender_name, sender_organization, body_text, source_context, received_at",
    )
    .eq("connected_account_id", account.id)
    .eq("analysis_status", "pending")
    .order("received_at", { ascending: false })
    .limit(25)
    .returns<SourceMessageRow[]>();

  if (error) throw error;
  if (!pending?.length) return 0;

  await supabase
    .from("source_messages")
    .update({ analysis_status: "processing" })
    .in(
      "id",
      pending.map((message) => message.id),
    );

  try {
    const analysis = await analyzeRawMessages(
      pending.map(serializeForAnalysis).join("\n\n"),
      DEFAULT_GOALS,
    );
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
          error instanceof Error ? error.message : "Slack analysis failed.",
      })
      .in(
        "id",
        pending.map((message) => message.id),
      );
    throw error;
  }
}

async function hydrateMessageContext(
  accessToken: string,
  conversation: SlackConversation,
  message: SlackMessageEvent,
) {
  const fullConversation =
    conversation.name || conversation.is_im || conversation.is_mpim
      ? conversation
      : await getSlackConversationInfo(accessToken, message.channel).catch(
          () => conversation,
        );
  const sender: SlackUser | null = message.user
    ? await getSlackUserInfo(accessToken, message.user).catch(() => ({
        id: message.user ?? "",
      }))
    : null;

  return { conversation: fullConversation, sender };
}

export async function syncSlackAccount(
  supabase: SupabaseClient,
  account: SlackConnectedAccountRow,
) {
  if (account.status === "disconnected") {
    return { importedCount: 0, analyzedCount: 0 };
  }

  try {
    await markAccount(supabase, account.id, {
      last_sync_at: new Date().toISOString(),
      last_error: null,
    });

    const accessToken = getAccessToken(account);
    const workspaceId = account.workspace_id || "slack";
    const workspaceName = account.workspace_name || "Slack";
    const conversations = await listSlackConversations(accessToken);
    const normalized: NormalizedSourceMessage[] = [];

    for (const conversation of conversations.slice(0, 10)) {
      const messages = await getSlackConversationHistory(
        accessToken,
        conversation.id,
      ).catch(() => []);

      for (const message of messages.slice(0, 5)) {
        const context = await hydrateMessageContext(
          accessToken,
          conversation,
          message,
        );
        const normalizedMessage = normalizeSlackMessage({
          userId: account.user_id,
          connectedAccountId: account.id,
          workspaceId,
          workspaceName,
          event: message,
          conversation: context.conversation,
          sender: context.sender,
        });

        if (normalizedMessage) normalized.push(normalizedMessage);
      }
    }

    await insertNormalizedMessages(supabase, normalized);
    const analyzedCount = await analyzePendingMessages(supabase, account);

    await markAccount(supabase, account.id, {
      status: "connected",
      last_successful_sync_at: new Date().toISOString(),
      last_error: null,
    });

    return { importedCount: normalized.length, analyzedCount };
  } catch (error) {
    const needsReconnect =
      error instanceof Error &&
      /invalid_auth|not_authed|token missing/i.test(error.message);

    await markAccount(supabase, account.id, {
      status: needsReconnect ? "reauth_required" : "sync_error",
      last_error:
        needsReconnect
          ? "Slack access expired. Reconnect Slack."
          : error instanceof Error
            ? error.message
            : "Slack sync failed. Try reconnecting Slack.",
    });
    throw error;
  }
}

export async function ingestSlackEvent(
  supabase: SupabaseClient,
  account: SlackConnectedAccountRow,
  event: SlackMessageEvent,
) {
  const accessToken = getAccessToken(account);
  const workspaceId = account.workspace_id || event.team || "slack";
  const workspaceName = account.workspace_name || "Slack";
  const conversation = await getSlackConversationInfo(
    accessToken,
    event.channel,
  ).catch(() => ({ id: event.channel }));
  const sender = event.user
    ? await getSlackUserInfo(accessToken, event.user).catch(() => ({
        id: event.user ?? "",
      }))
    : null;
  const normalized = normalizeSlackMessage({
    userId: account.user_id,
    connectedAccountId: account.id,
    workspaceId,
    workspaceName,
    event,
    conversation,
    sender,
  });

  if (!normalized) return { importedCount: 0, analyzedCount: 0 };

  await insertNormalizedMessages(supabase, [normalized], {
    ignoreDuplicates: event.subtype !== "message_changed",
  });
  const analyzedCount = await analyzePendingMessages(supabase, account);

  return { importedCount: 1, analyzedCount };
}

function slackExternalMessageId(
  account: SlackConnectedAccountRow,
  event: SlackMessageEvent,
) {
  const workspaceId = account.workspace_id || event.team || "slack";
  return `${workspaceId}:${event.channel}:${event.ts}`;
}

async function markSlackMessageDeleted(
  supabase: SupabaseClient,
  account: SlackConnectedAccountRow,
  event: SlackMessageEvent,
) {
  const deletedTs = event.deleted_ts ?? event.previous_message?.ts ?? event.ts;
  const externalMessageId = slackExternalMessageId(account, {
    ...event,
    ts: deletedTs,
  });

  const { data: sourceMessage } = await supabase
    .from("source_messages")
    .update({
      analysis_status: "ignored",
      analysis_error: "Message was deleted in Slack.",
    })
    .eq("connected_account_id", account.id)
    .eq("external_message_id", externalMessageId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (sourceMessage?.id) {
    await supabase
      .from("analyzed_messages")
      .update({
        status: "ignored",
        updated_at: new Date().toISOString(),
      })
      .eq("source_message_id", sourceMessage.id);
  }

  return { importedCount: 0, analyzedCount: 0, deleted: Boolean(sourceMessage) };
}

export async function ingestSlackEventPayload(
  supabase: SupabaseClient,
  account: SlackConnectedAccountRow,
  event: SlackMessageEvent,
) {
  if (event.subtype === "message_deleted") {
    return markSlackMessageDeleted(supabase, account, event);
  }

  if (event.subtype === "message_changed" && event.message) {
    return ingestSlackEvent(supabase, account, {
      ...event.message,
      type: "message",
      team: event.team ?? event.message.team,
      channel: event.channel,
      subtype: "message_changed",
    });
  }

  return ingestSlackEvent(supabase, account, event);
}

export async function syncPrimarySlackAccount(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select("id, user_id, workspace_id, workspace_name, access_token_encrypted, status")
    .eq("user_id", userId)
    .eq("provider", "slack")
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<SlackConnectedAccountRow>();

  if (error) throw error;
  if (!account) return null;

  return syncSlackAccount(supabase, account);
}
