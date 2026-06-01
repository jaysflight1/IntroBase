import type { Priority } from "@/types";

export function formatMessageSubtitle(
  source: string,
  category: string,
  priority: Priority,
): string {
  const parts = [source.trim(), category, priority].filter(Boolean);
  return parts.join(" · ");
}
