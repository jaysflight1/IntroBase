import { NextResponse } from "next/server";

import { decodeGmailPubSubBody } from "@/lib/integrations/gmail/pubsub";
import { enqueueSyncJob } from "@/lib/integrations/syncJobs";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ConnectedAccountRow {
  id: string;
  user_id: string;
  provider_account_email: string | null;
  refresh_token_encrypted: string | null;
  status: string;
}

function isAuthorized(request: Request) {
  const expectedToken = process.env.GMAIL_PUBSUB_WEBHOOK_TOKEN;

  if (!expectedToken) {
    return true;
  }

  return new URL(request.url).searchParams.get("token") === expectedToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const notification = decodeGmailPubSubBody(payload);

  if (!notification) {
    return NextResponse.json({ ok: true, skipped: "invalid_payload" });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "storage_not_configured" });
  }

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("id, user_id, provider_account_email, refresh_token_encrypted, status")
    .eq("provider", "gmail")
    .eq("provider_account_email", notification.emailAddress)
    .neq("status", "disconnected")
    .returns<ConnectedAccountRow[]>();

  for (const account of accounts ?? []) {
    await enqueueSyncJob(supabase, {
      userId: account.user_id,
      connectedAccountId: account.id,
      provider: "gmail",
      jobType: "gmail_incremental_sync",
      payload: {
        historyId: notification.historyId,
        emailAddress: notification.emailAddress,
      },
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    matchedAccounts: accounts?.length ?? 0,
    historyId: notification.historyId,
  });
}
