import { z } from "zod";

export const analyticsEventNames = [
  "visited_landing",
  "visited_app",
  "returned_visit",
  "clicked_cta",
  "started_import",
  "used_sample_inbox",
  "created_import_message",
  "deleted_import_message",
  "requeued_import_message",
  "submitted_messages",
  "analyzed_messages",
  "analysis_failed",
  "viewed_board",
  "opened_message",
  "copied_reply",
  "changed_priority",
  "reordered_message",
  "deleted_message",
  "edited_deadline",
  "edited_suggested_reply",
  "saved_contact",
  "starred_contact",
  "unstarred_contact",
  "saved_contact_note",
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

const prioritySchema = z.enum(["high", "medium", "low"]);
const urgencySchema = z
  .enum([
    "today",
    "this_week",
    "this_month",
    "later",
    "ignore",
    "reply_now",
    "reply_this_week",
    "follow_up_later",
    "low_priority",
  ])
  .transform((value) => {
    const legacyMap: Record<string, "today" | "this_week" | "this_month" | "later" | "ignore"> = {
      reply_now: "today",
      reply_this_week: "this_week",
      follow_up_later: "this_month",
      low_priority: "later",
      today: "today",
      this_week: "this_week",
      this_month: "this_month",
      later: "later",
      ignore: "ignore",
    };
    return legacyMap[value] ?? "later";
  });
const categorySchema = z.enum([
  "investor",
  "customer",
  "hiring",
  "collaborator",
  "mentor",
  "school",
  "personal",
  "application",
  "sales",
  "spam",
  "other",
]);
const analysisDiagnosticsSchema = z.object({
  engine: z.enum(["openai", "fallback"]),
  model: z.string().min(1),
  openaiAttempted: z.boolean(),
  fallbackReason: z
    .enum([
      "missing_api_key",
      "production_openai_disabled",
      "openai_request_failed",
      "invalid_openai_response",
    ])
    .optional(),
});

export const analyzePayloadSchema = z.object({
  anonymous_user_id: z.string().min(4).max(160),
  session_id: z.string().min(4).max(160).optional().nullable(),
  raw_messages: z.string().trim().min(1).max(25_000),
  user_goals: z.object({
    prioritize: z.array(z.string().max(80)).max(12),
    context: z.string().max(800).default(""),
  }),
});

export const analysisResultSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().min(1),
        source: z.string().default(""),
        senderName: z.string().min(1),
        senderOrganization: z.string().optional().default(""),
        senderRole: z.string().optional().default(""),
        originalText: z.string().min(1),
        summary: z.string().min(1),
        category: categorySchema,
        priority: prioritySchema,
        urgency: urgencySchema,
        priorityScore: z.number().min(0).max(100),
        deadline: z.string().optional().default(""),
        suggestedAction: z.string().min(1),
        suggestedReply: z.string().min(1),
        whyItMatters: z.string().min(1),
        followUpDate: z.string().optional().default(""),
        contactTags: z.array(z.string()).default([]),
        status: z.enum(["new", "replied", "follow_up", "ignored"]).default("new"),
      }),
    )
    .max(50),
  contacts: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        organization: z.string().optional().default(""),
        role: z.string().optional().default(""),
        source: z.string().default(""),
        tags: z.array(z.string()).default([]),
        lastInteractionSummary: z.string().min(1),
        priority: prioritySchema,
        nextStep: z.string().min(1),
        lastInteractionAt: z.string().optional().default(""),
      }),
    )
    .max(50),
  sourceTypes: z.array(z.string()).default([]),
  categoryCounts: z.record(z.string(), z.number()).default({}),
  messageCount: z.number().int().min(0).max(50),
  analysisDiagnostics: analysisDiagnosticsSchema.optional(),
});
