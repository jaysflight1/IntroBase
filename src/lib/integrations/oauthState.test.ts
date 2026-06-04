import { afterEach, describe, expect, it, vi } from "vitest";

import { createOAuthState, verifyOAuthState } from "@/lib/integrations/oauthState";

const originalSecret = process.env.OAUTH_STATE_SECRET;

afterEach(() => {
  process.env.OAUTH_STATE_SECRET = originalSecret;
  vi.useRealTimers();
});

describe("oauthState", () => {
  it("round-trips valid state", () => {
    process.env.OAUTH_STATE_SECRET = "oauth-secret";

    const state = createOAuthState("user-1", "/app/integrations");

    expect(verifyOAuthState(state, "user-1")).toMatchObject({
      userId: "user-1",
      nextPath: "/app/integrations",
    });
  });

  it("rejects tampered state", () => {
    process.env.OAUTH_STATE_SECRET = "oauth-secret";

    const state = createOAuthState("user-1", "/app/integrations");

    expect(verifyOAuthState(`${state}x`, "user-1")).toBeNull();
  });

  it("rejects expired state", () => {
    process.env.OAUTH_STATE_SECRET = "oauth-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T10:00:00Z"));
    const state = createOAuthState("user-1", "/app/integrations");

    vi.setSystemTime(new Date("2026-06-03T10:11:00Z"));

    expect(verifyOAuthState(state, "user-1")).toBeNull();
  });
});
