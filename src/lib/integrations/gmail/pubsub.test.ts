import { describe, expect, it } from "vitest";

import { decodeGmailPubSubBody } from "@/lib/integrations/gmail/pubsub";

describe("decodeGmailPubSubBody", () => {
  it("decodes valid Gmail Pub/Sub payloads", () => {
    const data = Buffer.from(
      JSON.stringify({
        emailAddress: "founder@example.com",
        historyId: "12345",
      }),
      "utf8",
    ).toString("base64");

    expect(decodeGmailPubSubBody({ message: { data } })).toEqual({
      emailAddress: "founder@example.com",
      historyId: "12345",
    });
  });

  it("rejects malformed payloads", () => {
    expect(decodeGmailPubSubBody({ message: {} })).toBeNull();
    expect(decodeGmailPubSubBody({ message: { data: "not-json" } })).toBeNull();
  });
});
