import { describe, expect, it } from "vitest";

import {
  ANALYSIS_LIMIT_PER_HOUR,
  hasReachedAnalysisLimit,
  isAnalysisLimitExempt,
} from "@/lib/analysis/rateLimit";

describe("analysis rate limit", () => {
  it("allows up to 15 analyses per hour", () => {
    expect(ANALYSIS_LIMIT_PER_HOUR).toBe(15);
    expect(hasReachedAnalysisLimit(14)).toBe(false);
    expect(hasReachedAnalysisLimit(15)).toBe(true);
  });

  it("exempts the configured signed-in user email", () => {
    expect(isAnalysisLimitExempt("jayrroy1@gmail.com")).toBe(true);
    expect(isAnalysisLimitExempt(" JAYRROY1@GMAIL.COM ")).toBe(true);
    expect(isAnalysisLimitExempt("someone@example.com")).toBe(false);
    expect(isAnalysisLimitExempt(null)).toBe(false);
  });
});
