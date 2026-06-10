import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("connected_accounts")
    .select("id")
    .eq("user_id", user.id)
    .returns<{ id: string }[]>();

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  const accountIds = (accounts ?? []).map((account) => account.id);

  if (accountIds.length) {
    const { error: cursorError } = await supabase
      .from("sync_cursors")
      .delete()
      .in("connected_account_id", accountIds);

    if (cursorError) {
      return NextResponse.json({ error: cursorError.message }, { status: 500 });
    }
  }

  const deletions = [
    supabase.from("follow_ups").delete().eq("user_id", user.id),
    supabase.from("saved_contacts").delete().eq("user_id", user.id),
    supabase.from("sync_jobs").delete().eq("user_id", user.id),
    supabase.from("analyzed_messages").delete().eq("user_id", user.id),
    supabase.from("source_messages").delete().eq("user_id", user.id),
    supabase.from("connected_accounts").delete().eq("user_id", user.id),
    supabase.from("profiles").delete().eq("id", user.id),
  ];

  for (const deletion of deletions) {
    const { error } = await deletion;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
