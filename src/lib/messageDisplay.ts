import { getTimingLabel } from "@/lib/replyTiming";
import type { Urgency } from "@/types";

export function formatMessageSubtitle(
  source: string,
  category: string,
  urgency: Urgency,
): string {
  const parts = [source.trim(), category, getTimingLabel(urgency)].filter(Boolean);
  return parts.join(" · ");
}
