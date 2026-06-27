import { describe, expect, it } from "vitest";

import { shouldShowNewUserOnboarding } from "@/lib/auth/onboarding";

describe("shouldShowNewUserOnboarding", () => {
  const now = Date.parse("2026-06-27T12:00:00.000Z");

  it("shows onboarding when no profile exists", () => {
    expect(
      shouldShowNewUserOnboarding({
        now,
        profileExists: false,
        profileLookupFailed: false,
      }),
    ).toBe(true);
  });

  it("shows onboarding for recently created auth accounts even if a profile exists", () => {
    expect(
      shouldShowNewUserOnboarding({
        authCreatedAt: "2026-06-27T11:45:00.000Z",
        now,
        profileExists: true,
        profileLookupFailed: false,
      }),
    ).toBe(true);
  });

  it("does not show onboarding for older users with profiles", () => {
    expect(
      shouldShowNewUserOnboarding({
        authCreatedAt: "2026-06-27T10:00:00.000Z",
        now,
        profileExists: true,
        profileLookupFailed: false,
      }),
    ).toBe(false);
  });
});
