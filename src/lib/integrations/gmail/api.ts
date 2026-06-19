import type { GmailMessage } from "@/lib/integrations/gmail/types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new GmailApiError("Gmail API request failed", response.status);
  }

  return (await response.json()) as T;
}

export async function listRecentInboxMessageIds(accessToken: string) {
  const params = new URLSearchParams({
    maxResults: "25",
    q: "newer_than:7d",
  });
  params.append("labelIds", "INBOX");

  const payload = await gmailFetch<{
    messages?: { id: string; threadId?: string }[];
    resultSizeEstimate?: number;
  }>(accessToken, `/messages?${params.toString()}`);

  return payload.messages?.map((message) => message.id).slice(0, 25) ?? [];
}

export async function listInboxHistoryMessageIds(
  accessToken: string,
  startHistoryId: string,
) {
  const messageIds = new Set<string>();
  let nextPageToken: string | undefined;
  let latestHistoryId = startHistoryId;

  do {
    const params = new URLSearchParams({
      startHistoryId,
      historyTypes: "messageAdded",
      labelId: "INBOX",
    });

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const payload = await gmailFetch<{
      history?: {
        id?: string;
        messagesAdded?: { message?: { id?: string; labelIds?: string[] } }[];
      }[];
      historyId?: string;
      nextPageToken?: string;
    }>(accessToken, `/history?${params.toString()}`);

    for (const history of payload.history ?? []) {
      if (history.id) {
        latestHistoryId = history.id;
      }

      for (const added of history.messagesAdded ?? []) {
        const message = added.message;

        if (message?.id && message.labelIds?.includes("INBOX")) {
          messageIds.add(message.id);
        }
      }
    }

    latestHistoryId = payload.historyId ?? latestHistoryId;
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken && messageIds.size < 50);

  return {
    messageIds: Array.from(messageIds).slice(0, 50),
    historyId: latestHistoryId,
  };
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  const params = new URLSearchParams({
    format: "full",
  });

  return gmailFetch<GmailMessage>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?${params.toString()}`,
  );
}

export async function watchGmailInbox(accessToken: string) {
  const topicName = process.env.GOOGLE_GMAIL_PUBSUB_TOPIC;

  if (!topicName) {
    return null;
  }

  const response = await fetch(`${GMAIL_API_BASE}/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
    }),
  });

  if (!response.ok) {
    throw new Error("Gmail watch registration failed");
  }

  return (await response.json()) as {
    historyId?: string;
    expiration?: string;
  };
}
