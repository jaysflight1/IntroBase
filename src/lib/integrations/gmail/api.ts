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
