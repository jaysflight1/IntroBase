import { NextResponse } from "next/server";

import { eventPayloadSchema } from "@/lib/apiSchemas";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = eventPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "supabase_not_configured" });
  }

  const { error } = await supabase.from("events").insert(parsed.data);

  if (error) {
    console.error("[analytics_event_log_failed]", {
      message: error.message,
      code: error.code,
    });

    return NextResponse.json({ ok: true, skipped: "event_log_failed" });
  }

  return NextResponse.json({ ok: true });
}
