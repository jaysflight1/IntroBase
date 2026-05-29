export type Priority = "high" | "medium" | "low";

export type Urgency =
  | "reply_now"
  | "reply_this_week"
  | "follow_up_later"
  | "low_priority"
  | "ignore";

export type MessageCategory =
  | "investor"
  | "customer"
  | "hiring"
  | "collaborator"
  | "mentor"
  | "school"
  | "personal"
  | "application"
  | "sales"
  | "spam"
  | "other";

export type MessageStatus = "new" | "replied" | "follow_up" | "ignored";

export interface AnalyzedMessage {
  id: string;
  source: string;
  senderName: string;
  senderOrganization?: string;
  senderRole?: string;
  originalText: string;
  summary: string;
  category: MessageCategory;
  priority: Priority;
  urgency: Urgency;
  priorityScore: number;
  deadline?: string;
  suggestedAction: string;
  suggestedReply: string;
  whyItMatters: string;
  followUpDate?: string;
  contactTags: string[];
  status: MessageStatus;
}

export interface ExtractedContact {
  id: string;
  name: string;
  organization?: string;
  role?: string;
  source: string;
  tags: string[];
  lastInteractionSummary: string;
  priority: Priority;
  nextStep: string;
  lastInteractionAt?: string;
  note?: string;
}

export interface FollowUp {
  id: string;
  messageId?: string;
  contactId?: string;
  person: string;
  followUpDate: string;
  reason: string;
  suggestedMessage: string;
  status: "upcoming" | "due_today" | "overdue" | "done";
}

export interface AnalysisResult {
  messages: AnalyzedMessage[];
  contacts: ExtractedContact[];
  sourceTypes: string[];
  categoryCounts: Record<string, number>;
  messageCount: number;
}

export interface UserGoals {
  prioritize: string[];
  context: string;
}
