import { afterEach, describe, expect, it } from "vitest";

import {
  buildGmailOAuthUrl,
  GMAIL_READONLY_SCOPE,
} from "@/lib/integrations/gmail/oauth";

const originalEnv = {
  clientId: process.env.GOOGLE_GMAIL_CLIENT_ID,
  clientSecret: process.env.GOOGLE_GMAIL_CLIENT_SECRET,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
};

afterEach(() => {
  process.env.GOOGLE_GMAIL_CLIENT_ID = originalEnv.clientId;
  process.env.GOOGLE_GMAIL_CLIENT_SECRET = originalEnv.clientSecret;
  process.env.NEXT_PUBLIC_APP_URL = originalEnv.appUrl;
});

describe("gmail oauth", () => {
  it("builds a read-only Gmail OAuth URL", () => {
    process.env.GOOGLE_GMAIL_CLIENT_ID = "google-client";
    process.env.GOOGLE_GMAIL_CLIENT_SECRET = "google-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://introbase.example";

    const url = new URL(
      buildGmailOAuthUrl({
        state: "signed-state",
        loginHint: "founder@example.com",
        nextPath: "/app/integrations?gmail=1",
      }),
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("scope")).toBe(GMAIL_READONLY_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("login_hint")).toBe("founder@example.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://introbase.example/api/integrations/gmail/callback",
    );
    expect(url.searchParams.get("scope")).not.toContain("gmail.send");
    expect(url.searchParams.get("scope")).not.toContain("gmail.modify");
  });
});
