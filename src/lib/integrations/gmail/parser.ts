import type { GmailMessage, GmailPayloadPart } from "@/lib/integrations/gmail/types";
import type { NormalizedSourceMessage } from "@/types/integrations";

const MAX_BODY_CHARS = 12_000;

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanBody(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\nOn .+wrote:\n[\s\S]*$/i, "")
    .replace(/\n>{1,}[\s\S]*$/m, "")
    .trim()
    .slice(0, MAX_BODY_CHARS);
}

function collectBodyParts(
  part: GmailPayloadPart | undefined,
  texts: string[],
  htmls: string[],
  attachmentFilenames: string[],
) {
  if (!part) return;

  if (part.filename) {
    attachmentFilenames.push(part.filename);
  }

  const data = part.body?.data ? decodeBase64Url(part.body.data) : "";

  if (data && part.mimeType === "text/plain") {
    texts.push(data);
  } else if (data && part.mimeType === "text/html") {
    htmls.push(stripHtml(data));
  }

  part.parts?.forEach((child) =>
    collectBodyParts(child, texts, htmls, attachmentFilenames),
  );
}

export function getGmailHeader(message: GmailMessage, headerName: string) {
  const headers = message.payload?.headers ?? [];
  return (
    headers.find(
      (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
    )?.value ?? ""
  );
}

export function parseSender(value: string) {
  const emailMatch = value.match(/<([^>]+)>/);
  const email = emailMatch?.[1]?.trim() || (value.includes("@") ? value.trim() : "");
  const name = value
    .replace(/<[^>]+>/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  return {
    name: name || email || "Unknown sender",
    email: email || undefined,
  };
}

export function extractGmailBody(message: GmailMessage) {
  const texts: string[] = [];
  const htmls: string[] = [];
  const attachmentFilenames: string[] = [];

  collectBodyParts(message.payload, texts, htmls, attachmentFilenames);

  const body = cleanBody((texts.length ? texts : htmls).join("\n\n"));

  return {
    bodyText: body || message.snippet || "(No readable message body)",
    attachmentFilenames,
    truncated: body.length >= MAX_BODY_CHARS,
  };
}

export function normalizeGmailMessage(input: {
  userId: string;
  connectedAccountId: string;
  accountEmail: string;
  message: GmailMessage;
}): NormalizedSourceMessage {
  const { message } = input;
  const from = parseSender(getGmailHeader(message, "From"));
  const subject = getGmailHeader(message, "Subject") || "(No subject)";
  const dateHeader = getGmailHeader(message, "Date");
  const receivedAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : dateHeader
      ? new Date(dateHeader).toISOString()
      : new Date().toISOString();
  const body = extractGmailBody(message);

  return {
    userId: input.userId,
    provider: "gmail",
    connectedAccountId: input.connectedAccountId,
    externalAccountId: input.accountEmail,
    externalMessageId: message.id,
    externalThreadId: message.threadId,
    senderName: from.name,
    senderEmail: from.email,
    sourceLabel: "Gmail",
    sourceContext: {
      gmailAccountEmail: input.accountEmail,
      gmailLabelIds: message.labelIds ?? [],
      gmailInternalDate: message.internalDate ?? "",
      gmailHistoryId: message.historyId ?? "",
      attachmentCount: body.attachmentFilenames.length,
    },
    subject,
    bodyText: body.bodyText,
    receivedAt,
    rawMetadata: {
      snippet: message.snippet ?? "",
      historyId: message.historyId ?? "",
      attachmentFilenames: body.attachmentFilenames,
      truncated: body.truncated,
    },
  };
}
