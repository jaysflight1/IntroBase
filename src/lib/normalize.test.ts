import { describe, expect, it } from "vitest";

import {
  normalizeCategory,
  normalizePriority,
  normalizeUrgency,
} from "@/lib/normalize";

describe("normalize helpers", () => {
  it("keeps valid values", () => {
    expect(normalizePriority("high")).toBe("high");
    expect(normalizeUrgency("today")).toBe("today");
    expect(normalizeCategory("investor")).toBe("investor");
  });

  it("migrates legacy urgency values", () => {
    expect(normalizeUrgency("reply_now")).toBe("today");
    expect(normalizeUrgency("reply_this_week")).toBe("this_week");
    expect(normalizeUrgency("follow_up_later")).toBe("this_month");
    expect(normalizeUrgency("low_priority")).toBe("later");
  });

  it("falls back for invalid values", () => {
    expect(normalizePriority("urgent")).toBe("low");
    expect(normalizeUrgency("someday")).toBe("later");
    expect(normalizeCategory("vip")).toBe("other");
  });
});
