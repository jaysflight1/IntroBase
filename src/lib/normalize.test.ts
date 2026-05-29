import { describe, expect, it } from "vitest";

import {
  normalizeCategory,
  normalizePriority,
  normalizeUrgency,
} from "@/lib/normalize";

describe("normalize helpers", () => {
  it("keeps valid values", () => {
    expect(normalizePriority("high")).toBe("high");
    expect(normalizeUrgency("reply_now")).toBe("reply_now");
    expect(normalizeCategory("investor")).toBe("investor");
  });

  it("falls back for invalid values", () => {
    expect(normalizePriority("urgent")).toBe("low");
    expect(normalizeUrgency("today")).toBe("low_priority");
    expect(normalizeCategory("vip")).toBe("other");
  });
});
