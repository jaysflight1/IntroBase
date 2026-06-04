import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifySlackSignature } from "@/lib/integrations/slack/signature";

function sign(secret: string, timestamp: string, body: string) {
  return `v0=${createHmac("sha256", secret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;
}

describe("verifySlackSignature", () => {
  it("accepts a valid Slack signature", () => {
    const body = "{\"type\":\"event_callback\"}";
    const timestamp = "1780000000";

    expect(
      verifySlackSignature({
        body,
        timestamp,
        signature: sign("secret", timestamp, body),
        signingSecret: "secret",
        nowSeconds: 1780000010,
      }),
    ).toBe(true);
  });

  it("rejects stale timestamps and invalid signatures", () => {
    expect(
      verifySlackSignature({
        body: "{}",
        timestamp: "1780000000",
        signature: "v0=bad",
        signingSecret: "secret",
        nowSeconds: 1780001000,
      }),
    ).toBe(false);
  });
});
