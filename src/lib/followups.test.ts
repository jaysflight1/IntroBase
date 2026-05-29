import { describe, expect, it } from "vitest";

import { getFollowUpStatus } from "@/lib/followups";

describe("getFollowUpStatus", () => {
  const currentDate = new Date("2026-05-29T12:00:00-07:00");

  it("returns due_today for today's date", () => {
    expect(getFollowUpStatus("2026-05-29", currentDate)).toBe("due_today");
  });

  it("returns overdue for past dates", () => {
    expect(getFollowUpStatus("2026-05-20", currentDate)).toBe("overdue");
  });

  it("returns upcoming for future dates", () => {
    expect(getFollowUpStatus("2026-06-01", currentDate)).toBe("upcoming");
  });
});
