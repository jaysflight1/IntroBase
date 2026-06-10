import { NextResponse } from "next/server";

import { enqueueSyncJob } from "@/lib/integrations/syncJobs";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ConnectedAccountRow {
  id: string;
  user_id: string;
  provider: "gmail" | "slack";
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  const { data: accounts, error } = await supabase
    .from("connected_accounts")
    .select("id, user_id, provider")
    .in("provider", ["gmail", "slack"])
    .eq("status", "connected")
    .returns<ConnectedAccountRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const account of accounts ?? []) {
    await enqueueSyncJob(supabase, {
      userId: account.user_id,
      connectedAccountId: account.id,
      provider: account.provider,
      jobType:
        account.provider === "gmail" ? "gmail_full_sync" : "slack_full_sync",
      payload: { reason: "fallback_poll" },
    });
  }

  return NextResponse.json({
    ok: true,
    enqueued: accounts?.length ?? 0,
  });
}
