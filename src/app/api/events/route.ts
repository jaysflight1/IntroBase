import { NextResponse } from "next/server";

import { eventPayloadSchema } from "@/lib/apiSchemas";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = eventPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "supabase_not_configured" });
  }

  const { error } = await supabase.from("events").insert(parsed.data);

  if (error) {
    return NextResponse.json({ error: "Could not log event" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
