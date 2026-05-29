import type { FollowUp } from "@/types";

export function getFollowUpStatus(
  followUpDate: string,
  currentDate = new Date(),
): FollowUp["status"] {
  const today = currentDate.toISOString().slice(0, 10);

  if (!followUpDate) return "upcoming";
  if (followUpDate === today) return "due_today";
  if (followUpDate < today) return "overdue";
  return "upcoming";
}
