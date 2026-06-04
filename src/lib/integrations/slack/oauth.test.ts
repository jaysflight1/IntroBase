import { afterEach, describe, expect, it } from "vitest";

import {
  buildSlackOAuthUrl,
  SLACK_BOT_SCOPES,
} from "@/lib/integrations/slack/oauth";

const originalEnv = {
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
};

afterEach(() => {
  process.env.SLACK_CLIENT_ID = originalEnv.clientId;
  process.env.SLACK_CLIENT_SECRET = originalEnv.clientSecret;
  process.env.NEXT_PUBLIC_APP_URL = originalEnv.appUrl;
});

describe("slack oauth", () => {
  it("builds a read-only Slack OAuth URL", () => {
    process.env.SLACK_CLIENT_ID = "slack-client";
    process.env.SLACK_CLIENT_SECRET = "slack-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://introbase.example";

    const url = new URL(
      buildSlackOAuthUrl({
        state: "signed-state",
        nextPath: "/app/integrations?slack=1",
      }),
    );

    expect(url.origin).toBe("https://slack.com");
    expect(url.searchParams.get("scope")).toBe(SLACK_BOT_SCOPES);
    expect(url.searchParams.get("scope")).not.toContain("chat:write");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://introbase.example/api/integrations/slack/callback",
    );
  });
});
