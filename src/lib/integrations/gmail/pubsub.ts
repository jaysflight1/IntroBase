export interface GmailPubSubNotification {
  emailAddress: string;
  historyId: string;
}

export function decodeGmailPubSubBody(payload: unknown) {
  const message = (payload as { message?: { data?: string } } | null)?.message;

  if (!message?.data) {
    return null;
  }

  const decoded = JSON.parse(
    Buffer.from(message.data, "base64").toString("utf8"),
  ) as Partial<GmailPubSubNotification>;

  if (!decoded.emailAddress || !decoded.historyId) {
    return null;
  }

  return {
    emailAddress: decoded.emailAddress,
    historyId: decoded.historyId,
  };
}
