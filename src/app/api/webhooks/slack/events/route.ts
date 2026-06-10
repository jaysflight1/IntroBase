import { NextResponse } from "next/server";

import { enqueueSyncJob } from "@/lib/integrations/syncJobs";
import { verifySlackSignature } from "@/lib/integrations/slack/signature";
import type { SlackMessageEvent } from "@/lib/integrations/slack/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ConnectedAccountRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  access_token_encrypted: string | null;
  status: string;
}

function isMessageEvent(value: unknown): value is SlackMessageEvent {
  const event = value as Partial<SlackMessageEvent>;
  return (
    event?.type === "message" &&
    typeof event.channel === "string" &&
    typeof event.ts === "string"
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (
    !verifySlackSignature({
      body: rawBody,
      timestamp: request.headers.get("x-slack-request-timestamp"),
      signature: request.headers.get("x-slack-signature"),
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    type?: string;
    challenge?: string;
    team_id?: string;
    event?: unknown;
  } | null;

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    payload = null;
  }

  if (!payload) {
    return NextResponse.json({ ok: true, skipped: "invalid_payload" });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true, skipped: "unsupported_event" });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "storage_not_configured" });
  }

  const eventTeam =
    typeof payload.event === "object" && payload.event !== null
      ? (payload.event as { team?: unknown }).team
      : null;
  const teamId =
    payload.team_id ?? (typeof eventTeam === "string" ? eventTeam : null);

  if (!teamId) {
    return NextResponse.json({ ok: true, skipped: "missing_team" });
  }

  const eventType =
    typeof payload.event === "object" && payload.event !== null
      ? (payload.event as { type?: unknown }).type
      : null;

  if (eventType === "app_uninstalled") {
    await supabase
      .from("connected_accounts")
      .update({
        status: "disconnected",
        last_error: "Slack app was uninstalled from the workspace.",
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "slack")
      .eq("workspace_id", teamId);

    return NextResponse.json({ ok: true, handled: "app_uninstalled" });
  }

  if (!isMessageEvent(payload.event)) {
    return NextResponse.json({ ok: true, skipped: "unsupported_event" });
  }

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("id, user_id, workspace_id, workspace_name, access_token_encrypted, status")
    .eq("provider", "slack")
    .eq("workspace_id", teamId)
    .neq("status", "disconnected")
    .returns<ConnectedAccountRow[]>();

  for (const account of accounts ?? []) {
    await enqueueSyncJob(supabase, {
      userId: account.user_id,
      connectedAccountId: account.id,
      provider: "slack",
      jobType: "slack_event",
      payload: {
        event: {
          ...payload.event,
          team: teamId,
        },
      },
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    matchedAccounts: accounts?.length ?? 0,
  });
}
