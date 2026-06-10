import { NextResponse } from "next/server";

import {
  renewGmailWatchForAccount,
  type GmailConnectedAccountRow,
} from "@/lib/integrations/gmail/sync";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
    .select("id, user_id, provider_account_email, refresh_token_encrypted, status")
    .eq("provider", "gmail")
    .eq("status", "connected")
    .returns<GmailConnectedAccountRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let renewed = 0;
  let failed = 0;

  for (const account of accounts ?? []) {
    try {
      await renewGmailWatchForAccount(supabase, account);
      renewed += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: accounts?.length ?? 0,
    renewed,
    failed,
  });
}
