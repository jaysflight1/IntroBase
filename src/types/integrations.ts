export type SourceProvider = "gmail" | "slack" | "manual";

export type ConnectedAccountStatus =
  | "connected"
  | "reauth_required"
  | "sync_error"
  | "disconnected";

export interface ConnectedAccountSummary {
  id: string;
  provider: SourceProvider;
  providerAccountEmail: string;
  displayName: string;
  status: ConnectedAccountStatus;
  lastSyncAt: string;
  lastSuccessfulSyncAt: string;
  lastError: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedSourceMessage {
  userId: string;
  provider: SourceProvider;
  connectedAccountId: string;
  externalAccountId: string;
  externalMessageId: string;
  externalThreadId?: string;
  sourceUrl?: string;
  senderName: string;
  senderEmail?: string;
  senderHandle?: string;
  organization?: string;
  sourceLabel: string;
  sourceContext: Record<string, unknown>;
  subject?: string;
  bodyText: string;
  receivedAt: string;
  rawMetadata: Record<string, unknown>;
}
