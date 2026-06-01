export {
  getTimingAccentClass as getPriorityAccentClass,
  getTimingBadgeClass as getPriorityBadgeClass,
  getTimingBarClass as getPriorityBarClass,
  getTimingCardClass as getPriorityCardClass,
  getTimingColumnClass,
  getTimingDotClass,
  getTimingPersonClass as getPriorityPersonClass,
  getTimingRowClass as getPriorityRowClass,
  getTimingVisual,
  getTimingLabel,
  migrateUrgency,
  urgencyToPriority,
} from "@/lib/replyTiming";

import type { Urgency } from "@/types";

import { getTimingVisual } from "@/lib/replyTiming";

export function getLaneVisualByUrgency(urgency: Urgency) {
  const visual = getTimingVisual(urgency);
  return {
    accent: visual.accent,
    column: visual.column,
    dot: visual.dot,
  };
}

export function getLaneVisualByTitle(title: string) {
  const match = [
    "Today",
    "This week",
    "This month",
    "Later",
  ].find((column) => column.toLowerCase() === title.toLowerCase());

  const urgencyByTitle: Record<string, Urgency> = {
    Today: "today",
    "This week": "this_week",
    "This month": "this_month",
    Later: "later",
  };

  if (match && match in urgencyByTitle) {
    return getLaneVisualByUrgency(urgencyByTitle[match]);
  }

  return getLaneVisualByUrgency("later");
}
