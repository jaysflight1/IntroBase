export const ANALYSIS_LIMIT_PER_HOUR = 15;

const ANALYSIS_LIMIT_EXEMPT_EMAILS = new Set(["jayrroy1@gmail.com"]);

export function isAnalysisLimitExempt(email: string | null | undefined) {
  return ANALYSIS_LIMIT_EXEMPT_EMAILS.has(email?.trim().toLowerCase() ?? "");
}

export function hasReachedAnalysisLimit(count: number | null | undefined) {
  return (count ?? 0) >= ANALYSIS_LIMIT_PER_HOUR;
}
