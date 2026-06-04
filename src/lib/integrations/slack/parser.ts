import type { NormalizedSourceMessage } from "@/types/integrations";
import type {
  SlackConversation,
  SlackConversationType,
  SlackMessageEvent,
  SlackUser,
} from "@/lib/integrations/slack/types";

const MAX_TEXT_CHARS = 12_000;

export function getSlackConversationType(
  conversation: SlackConversation,
): SlackConversationType {
  if (conversation.is_im) return "dm";
  if (conversation.is_mpim) return "mpim";
  if (conversation.is_group) return "private_channel";
  return "channel";
}

export function getSlackConversationLabel(conversation: SlackConversation) {
  const type = getSlackConversationType(conversation);

  if (type === "dm") return "DM";
  if (type === "mpim") return "Group DM";

  return conversation.name ? `#${conversation.name}` : "Unknown channel";
}

export function shouldIgnoreSlackMessage(event: SlackMessageEvent) {
  if (event.bot_id) return true;
  if (!event.text?.trim()) return true;

  const noisySubtypes = new Set([
    "bot_message",
    "channel_join",
    "channel_leave",
    "channel_topic",
    "channel_purpose",
    "message_deleted",
  ]);

  return Boolean(event.subtype && noisySubtypes.has(event.subtype));
}

export function getSlackSenderName(user: SlackUser | null, event: SlackMessageEvent) {
  if (user?.deleted) return "Former Slack user";

  return (
    user?.profile?.display_name ||
    user?.profile?.real_name ||
    user?.real_name ||
    user?.name ||
    event.username ||
    event.user ||
    "Unknown Slack user"
  );
}

export function normalizeSlackMessage(input: {
  userId: string;
  connectedAccountId: string;
  workspaceId: string;
  workspaceName: string;
  event: SlackMessageEvent;
  conversation: SlackConversation;
  sender: SlackUser | null;
}): NormalizedSourceMessage | null {
  if (shouldIgnoreSlackMessage(input.event)) {
    return null;
  }

  const conversationType = getSlackConversationType(input.conversation);
  const conversationLabel = getSlackConversationLabel(input.conversation);
  const senderName = getSlackSenderName(input.sender, input.event);
  const seconds = Number(input.event.ts.split(".")[0]);

  return {
    userId: input.userId,
    provider: "slack",
    connectedAccountId: input.connectedAccountId,
    externalAccountId: input.workspaceId,
    externalMessageId: `${input.workspaceId}:${input.event.channel}:${input.event.ts}`,
    externalThreadId: input.event.thread_ts,
    senderName,
    senderEmail: input.sender?.profile?.email,
    organization: input.workspaceName,
    sourceLabel: `${input.workspaceName} Slack - ${conversationLabel}`,
    sourceContext: {
      slackWorkspaceName: input.workspaceName,
      slackTeamId: input.workspaceId,
      slackChannelId: input.event.channel,
      slackChannelName: input.conversation.name ?? "",
      slackConversationType: conversationType,
      slackConversationLabel: conversationLabel,
      slackUserId: input.event.user ?? "",
      slackMessageTs: input.event.ts,
      slackThreadTs: input.event.thread_ts ?? "",
    },
    bodyText: input.event.text?.trim().slice(0, MAX_TEXT_CHARS) ?? "",
    receivedAt: Number.isFinite(seconds)
      ? new Date(seconds * 1000).toISOString()
      : new Date().toISOString(),
    rawMetadata: {
      subtype: input.event.subtype ?? "",
      truncated: (input.event.text?.length ?? 0) > MAX_TEXT_CHARS,
    },
  };
}
