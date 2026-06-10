import type { SupabaseClient } from "@supabase/supabase-js";

import {
  syncGmailAccount,
  syncGmailIncrementalAccount,
  type GmailConnectedAccountRow,
} from "@/lib/integrations/gmail/sync";
import {
  ingestSlackEventPayload,
  syncSlackAccount,
  type SlackConnectedAccountRow,
} from "@/lib/integrations/slack/sync";
import type { SlackMessageEvent } from "@/lib/integrations/slack/types";

const MAX_ATTEMPTS = 5;
const JOB_LIMIT = 10;

export type SyncJobProvider = "gmail" | "slack";

export type SyncJobType =
  | "gmail_full_sync"
  | "gmail_incremental_sync"
  | "slack_full_sync"
  | "slack_event";

interface SyncJobRow {
  id: string;
  user_id: string | null;
  connected_account_id: string | null;
  provider: SyncJobProvider;
  job_type: SyncJobType;
  attempt_count: number;
  payload: Record<string, unknown>;
}

export async function enqueueSyncJob(
  supabase: SupabaseClient,
  input: {
    userId?: string | null;
    connectedAccountId?: string | null;
    provider: SyncJobProvider;
    jobType: SyncJobType;
    payload?: Record<string, unknown>;
    runAfter?: string;
  },
) {
  await supabase.from("sync_jobs").insert({
    user_id: input.userId ?? null,
    connected_account_id: input.connectedAccountId ?? null,
    provider: input.provider,
    job_type: input.jobType,
    payload: input.payload ?? {},
    run_after: input.runAfter ?? new Date().toISOString(),
  });
}

async function claimDueJobs(supabase: SupabaseClient) {
  const { data: jobs, error } = await supabase
    .from("sync_jobs")
    .select(
      "id, user_id, connected_account_id, provider, job_type, attempt_count, payload",
    )
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(JOB_LIMIT)
    .returns<SyncJobRow[]>();

  if (error) throw error;
  if (!jobs?.length) return [];

  const claimed: SyncJobRow[] = [];

  for (const job of jobs) {
    const { data } = await supabase
      .from("sync_jobs")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select(
        "id, user_id, connected_account_id, provider, job_type, attempt_count, payload",
      )
      .maybeSingle<SyncJobRow>();

    if (data) claimed.push(data);
  }

  return claimed;
}

function retryDelayMs(attemptCount: number) {
  return Math.min(30 * 60 * 1000, 60_000 * 2 ** Math.max(0, attemptCount));
}

async function failJob(
  supabase: SupabaseClient,
  job: SyncJobRow,
  error: unknown,
) {
  const nextAttempt = job.attempt_count + 1;
  const dead = nextAttempt >= MAX_ATTEMPTS;

  await supabase
    .from("sync_jobs")
    .update({
      status: dead ? "dead" : "queued",
      attempt_count: nextAttempt,
      locked_at: null,
      run_after: new Date(Date.now() + retryDelayMs(nextAttempt)).toISOString(),
      last_error:
        error instanceof Error ? error.message : "Sync job failed unexpectedly.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

async function completeJob(supabase: SupabaseClient, jobId: string) {
  await supabase
    .from("sync_jobs")
    .update({
      status: "completed",
      locked_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function getGmailAccount(supabase: SupabaseClient, accountId: string) {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, user_id, provider_account_email, refresh_token_encrypted, status")
    .eq("id", accountId)
    .eq("provider", "gmail")
    .maybeSingle<GmailConnectedAccountRow>();

  if (error) throw error;
  return data;
}

async function getSlackAccount(supabase: SupabaseClient, accountId: string) {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, user_id, workspace_id, workspace_name, access_token_encrypted, status")
    .eq("id", accountId)
    .eq("provider", "slack")
    .maybeSingle<SlackConnectedAccountRow>();

  if (error) throw error;
  return data;
}

async function processJob(supabase: SupabaseClient, job: SyncJobRow) {
  if (!job.connected_account_id) {
    throw new Error("Sync job is missing connected_account_id");
  }

  if (job.provider === "gmail") {
    const account = await getGmailAccount(supabase, job.connected_account_id);
    if (!account) throw new Error("Gmail account not found");

    if (job.job_type === "gmail_incremental_sync") {
      const historyId =
        typeof job.payload.historyId === "string" ? job.payload.historyId : null;
      await syncGmailIncrementalAccount(supabase, account, historyId);
      return;
    }

    await syncGmailAccount(supabase, account);
    return;
  }

  const account = await getSlackAccount(supabase, job.connected_account_id);
  if (!account) throw new Error("Slack account not found");

  if (job.job_type === "slack_event") {
    if (!isSlackMessageEvent(job.payload.event)) {
      throw new Error("Slack event job is missing a message event payload");
    }

    await ingestSlackEventPayload(supabase, account, job.payload.event);
    return;
  }

  await syncSlackAccount(supabase, account);
}

function isSlackMessageEvent(value: unknown): value is SlackMessageEvent {
  const event = value as Partial<SlackMessageEvent>;
  return (
    event?.type === "message" &&
    typeof event.channel === "string" &&
    typeof event.ts === "string"
  );
}

export async function processDueSyncJobs(supabase: SupabaseClient) {
  const jobs = await claimDueJobs(supabase);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(supabase, job);
      await completeJob(supabase, job.id);
      completed += 1;
    } catch (error) {
      await failJob(supabase, job, error);
      failed += 1;
    }
  }

  return {
    claimed: jobs.length,
    completed,
    failed,
  };
}
