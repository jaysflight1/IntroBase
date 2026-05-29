import { z } from "zod";

export const analyticsEventNames = [
  "visited_landing",
  "visited_app",
  "returned_visit",
  "clicked_cta",
  "started_import",
  "used_sample_inbox",
  "submitted_messages",
  "analyzed_messages",
  "analysis_failed",
  "viewed_board",
  "opened_message",
  "copied_reply",
  "changed_priority",
  "saved_contact",
  "created_followup",
  "submitted_feedback",
  "left_email",
] as const;

export const eventPayloadSchema = z.object({
  anonymous_user_id: z.string().min(4).max(160),
  session_id: z.string().min(4).max(160).optional().nullable(),
  event_name: z.enum(analyticsEventNames),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const feedbackPayloadSchema = z.object({
  anonymous_user_id: z.string().min(4).max(160),
  session_id: z.string().min(4).max(160).optional().nullable(),
  usefulness_rating: z.string().max(80).optional(),
  would_use_again: z.string().max(80).optional(),
  willingness_to_pay: z.string().max(120).optional(),
  expanded_version_interest: z.string().max(400).optional(),
  biggest_problem: z.string().max(1200).optional(),
  what_worked: z.string().max(1200).optional(),
  what_failed: z.string().max(1200).optional(),
  email: z
    .string()
    .email()
    .max(254)
    .or(z.literal(""))
    .optional(),
});
