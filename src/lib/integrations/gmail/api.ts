import type { GmailMessage } from "@/lib/integrations/gmail/types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailFetch<T>(accessToken: string, path: string) {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Gmail API request failed");
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
