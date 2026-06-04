import type {
  SlackConversation,
  SlackMessageEvent,
  SlackUser,
} from "@/lib/integrations/slack/types";

const SLACK_API_BASE = "https://slack.com/api";

async function slackApi<T>(
  accessToken: string,
  method: string,
  params?: Record<string, string>,
) {
  const url = new URL(`${SLACK_API_BASE}/${method}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after") ?? "60";
    throw new Error(`Slack rate limited. Retry after ${retryAfter} seconds.`);
  }

  if (!response.ok) {
    throw new Error("Slack API request failed");
  }

  const payload = (await response.json()) as T & {
    ok?: boolean;
    error?: string;
  };

  if (payload.ok === false) {
    throw new Error(payload.error || "Slack API request failed");
  }

  return payload;
}

export async function listSlackConversations(accessToken: string) {
  const payload = await slackApi<{
    channels?: SlackConversation[];
  }>(accessToken, "conversations.list", {
    types: "public_channel,private_channel,im,mpim",
    limit: "20",
    exclude_archived: "true",
  });

  return payload.channels ?? [];
}

export async function getSlackConversationHistory(
  accessToken: string,
  channelId: string,
) {
  const oldest = String(Math.floor(Date.now() / 1000) - 72 * 60 * 60);
  const payload = await slackApi<{
    messages?: SlackMessageEvent[];
  }>(accessToken, "conversations.history", {
    channel: channelId,
    oldest,
    limit: "10",
  });

  return payload.messages ?? [];
}

export async function getSlackConversationInfo(
  accessToken: string,
  channelId: string,
) {
  const payload = await slackApi<{
    channel?: SlackConversation;
  }>(accessToken, "conversations.info", {
    channel: channelId,
  });

  return payload.channel ?? { id: channelId };
}

export async function getSlackUserInfo(accessToken: string, userId: string) {
  const payload = await slackApi<{
    user?: SlackUser;
  }>(accessToken, "users.info", {
    user: userId,
  });

  return payload.user ?? { id: userId };
}
