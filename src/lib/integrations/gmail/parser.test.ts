import { describe, expect, it } from "vitest";

import {
  extractGmailBody,
  getGmailHeader,
  normalizeGmailMessage,
  parseSender,
} from "@/lib/integrations/gmail/parser";
import type { GmailMessage } from "@/lib/integrations/gmail/types";

function b64(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

describe("gmail parser", () => {
  it("reads headers case-insensitively", () => {
    const message: GmailMessage = {
      id: "m1",
      payload: { headers: [{ name: "Subject", value: "Pilot request" }] },
    };

    expect(getGmailHeader(message, "subject")).toBe("Pilot request");
  });

  it("parses sender names and emails", () => {
    expect(parseSender('"Maya Chen" <maya@example.com>')).toEqual({
      name: "Maya Chen",
      email: "maya@example.com",
    });
  });

  it("prefers plain text over html", () => {
    const message: GmailMessage = {
      id: "m1",
      payload: {
        parts: [
          { mimeType: "text/html", body: { data: b64("<p>HTML body</p>") } },
          { mimeType: "text/plain", body: { data: b64("Plain body") } },
        ],
      },
    };

    expect(extractGmailBody(message).bodyText).toBe("Plain body");
  });

  it("falls back to stripped html", () => {
    const message: GmailMessage = {
      id: "m1",
      payload: {
        mimeType: "text/html",
        body: { data: b64("<p>Hello&nbsp;<strong>there</strong></p>") },
      },
    };

    expect(extractGmailBody(message).bodyText).toBe("Hello there");
  });

  it("normalizes Gmail messages for ingestion", () => {
    const message: GmailMessage = {
      id: "abc123",
      threadId: "thread-1",
      internalDate: "1780000000000",
      labelIds: ["INBOX"],
      payload: {
        headers: [
          { name: "From", value: "Maya Chen <maya@example.com>" },
          { name: "Subject", value: "Accelerator pilot" },
        ],
        body: { data: b64("Can we talk this week?") },
        mimeType: "text/plain",
      },
    };

    expect(
      normalizeGmailMessage({
        userId: "user-1",
        connectedAccountId: "account-1",
        accountEmail: "founder@example.com",
        message,
      }),
    ).toMatchObject({
      provider: "gmail",
      externalMessageId: "abc123",
      senderName: "Maya Chen",
      senderEmail: "maya@example.com",
      sourceLabel: "Gmail",
      subject: "Accelerator pilot",
      bodyText: "Can we talk this week?",
    });
  });
});
