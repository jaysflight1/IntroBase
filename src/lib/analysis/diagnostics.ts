import type {
  AnalysisDiagnostics,
  AnalysisDiagnosticsStats,
} from "@/types";

export const emptyAnalysisStats: AnalysisDiagnosticsStats = {
  totalRuns: 0,
  openaiRuns: 0,
  fallbackRuns: 0,
  missingApiKeyRuns: 0,
  productionDisabledRuns: 0,
  requestFailedRuns: 0,
  invalidResponseRuns: 0,
};

export function formatFallbackReason(
  reason: AnalysisDiagnostics["fallbackReason"],
) {
  if (reason === "missing_api_key") return "missing API key";
  if (reason === "production_openai_disabled") {
    return "OpenAI disabled in production";
  }
  if (reason === "openai_request_failed") return "GPT request failed";
  if (reason === "invalid_openai_response") return "invalid GPT response";
  return "unknown reason";
}

export function formatAnalyzerLabel(diagnostics?: AnalysisDiagnostics) {
  if (!diagnostics) return "No analysis yet";
  if (diagnostics.engine === "openai") return `GPT · ${diagnostics.model}`;
  return `Basic parser · ${formatFallbackReason(diagnostics.fallbackReason)}`;
}

export function recordAnalysisRun(
  current: AnalysisDiagnosticsStats,
  diagnostics?: AnalysisDiagnostics,
): AnalysisDiagnosticsStats {
  const base = { ...emptyAnalysisStats, ...current };
  const next: AnalysisDiagnosticsStats = {
    ...base,
    totalRuns: base.totalRuns + 1,
    lastRunAt: new Date().toISOString(),
    last: diagnostics,
  };

  if (diagnostics?.engine === "openai") {
    next.openaiRuns += 1;
    return next;
  }

  next.fallbackRuns += 1;
  if (diagnostics?.fallbackReason === "missing_api_key") {
    next.missingApiKeyRuns += 1;
  }
  if (diagnostics?.fallbackReason === "production_openai_disabled") {
    next.productionDisabledRuns += 1;
  }
  if (diagnostics?.fallbackReason === "openai_request_failed") {
    next.requestFailedRuns += 1;
  }
  if (diagnostics?.fallbackReason === "invalid_openai_response") {
    next.invalidResponseRuns += 1;
  }

  return next;
}
