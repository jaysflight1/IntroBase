import type { Priority, Urgency } from "@/types";

export interface LaneVisual {
  accent: string;
  badge: string;
  column: string;
  dot: string;
}

const laneByUrgency: Record<Urgency, LaneVisual> = {
  reply_now: {
    accent: "text-red-700",
    badge: "border-red-200/80 bg-red-50 text-red-700",
    column: "border-red-200/70 bg-red-50/50",
    dot: "bg-red-500",
  },
  reply_this_week: {
    accent: "text-amber-700",
    badge: "border-amber-200/80 bg-amber-50 text-amber-800",
    column: "border-amber-200/70 bg-amber-50/50",
    dot: "bg-amber-500",
  },
  follow_up_later: {
    accent: "text-violet-700",
    badge: "border-violet-200/80 bg-violet-50 text-violet-700",
    column: "border-violet-200/70 bg-violet-50/50",
    dot: "bg-violet-500",
  },
  low_priority: {
    accent: "text-slate-600",
    badge: "border-slate-200/80 bg-slate-50 text-slate-600",
    column: "border-slate-200/70 bg-slate-50/50",
    dot: "bg-slate-400",
  },
  ignore: {
    accent: "text-slate-500",
    badge: "border-slate-200/80 bg-slate-50 text-slate-500",
    column: "border-slate-200/70 bg-slate-50/40",
    dot: "bg-slate-300",
  },
};

const laneByTitle: Record<string, LaneVisual> = {
  "Reply now": laneByUrgency.reply_now,
  "This week": laneByUrgency.reply_this_week,
  "Follow up later": laneByUrgency.follow_up_later,
  "Low priority": laneByUrgency.low_priority,
};

export function getLaneVisualByTitle(title: string): LaneVisual {
  return laneByTitle[title] ?? laneByUrgency.low_priority;
}

export function getLaneVisualByUrgency(urgency: Urgency): LaneVisual {
  return laneByUrgency[urgency];
}

const priorityBadge: Record<Priority, string> = {
  high: "border-red-200/80 bg-red-50 text-red-700",
  medium: "border-yellow-200/80 bg-yellow-50 text-yellow-800",
  low: "border-slate-200/80 bg-slate-50 text-slate-600",
};

export function getPriorityBadgeClass(priority: Priority): string {
  return priorityBadge[priority];
}
