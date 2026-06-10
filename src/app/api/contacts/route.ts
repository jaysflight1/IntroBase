import { NextResponse } from "next/server";

import {
  contactToRow,
  isContact,
  rowToContact,
} from "@/lib/savedRelationships";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function GET() {
  const user = await getCurrentUser();
  const supabase = getSupabaseAdmin();

  if (!user || !supabase) {
    return NextResponse.json({ contacts: [] });
  }

  const { data, error } = await supabase
    .from("saved_contacts")
    .select(
      "id, name, organization, role, source, tags, last_interaction_summary, priority, next_step, last_interaction_at, note",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: (data ?? []).map(rowToContact) });
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
  const contact = body?.contact;

  if (!isContact(contact)) {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_contacts").upsert(
    contactToRow(user.id, contact),
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
