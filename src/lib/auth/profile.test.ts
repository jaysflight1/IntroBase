import { describe, expect, it } from "vitest";

import { mapUserToProfile } from "@/lib/auth/profile";

describe("mapUserToProfile", () => {
  it("maps Google profile metadata into profile fields", () => {
    expect(
      mapUserToProfile(
        {
          id: "user-1",
          email: "founder@example.com",
          user_metadata: {
            full_name: "Ada Founder",
            avatar_url: "https://example.com/avatar.png",
          },
        },
        "2026-06-03T12:00:00.000Z",
      ),
    ).toEqual({
      id: "user-1",
      email: "founder@example.com",
      full_name: "Ada Founder",
      avatar_url: "https://example.com/avatar.png",
      updated_at: "2026-06-03T12:00:00.000Z",
    });
  });

  it("falls back to alternate Google metadata keys", () => {
    expect(
      mapUserToProfile(
        {
          id: "user-2",
          email: null,
          user_metadata: {
            name: "Grace Builder",
            picture: "https://example.com/picture.png",
          },
        },
        "2026-06-03T12:00:00.000Z",
      ),
    ).toMatchObject({
      email: null,
      full_name: "Grace Builder",
      avatar_url: "https://example.com/picture.png",
    });
  });
});
