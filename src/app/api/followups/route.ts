import { NextResponse } from "next/server";

import {
  followUpToRow,
  isFollowUp,
  rowToFollowUp,
} from "@/lib/savedRelationships";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function GET() {
  const user = await getCurrentUser();
  const supabase = getSupabaseAdmin();

  if (!user || !supabase) {
    return NextResponse.json({ followups: [] });
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .select(
      "id, message_id, contact_id, person, follow_up_date, reason, suggested_message, status",
    )
    .eq("user_id", user.id)
    .order("follow_up_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ followups: (data ?? []).map(rowToFollowUp) });
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const followUp = body?.followup;

  if (!isFollowUp(followUp)) {
    return NextResponse.json({ error: "Invalid follow-up" }, { status: 400 });
  }

  const { error } = await supabase.from("follow_ups").upsert(
    followUpToRow(user.id, followUp),
    { onConflict: "user_id,id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  return POST(request);
}
