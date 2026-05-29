import { NextResponse } from "next/server";

import { feedbackPayloadSchema } from "@/lib/apiSchemas";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = feedbackPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const feedback = parsed.data;
  const email = feedback.email?.trim();

  if (!supabase) {
    return NextResponse.json({ ok: true, skipped: "supabase_not_configured" });
  }

  const { error } = await supabase.from("feedback").insert({
    ...feedback,
    email: email || null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save feedback" },
      { status: 500 },
    );
  }

  await supabase.from("events").insert({
    anonymous_user_id: feedback.anonymous_user_id,
    session_id: feedback.session_id,
    event_name: "submitted_feedback",
    metadata: {
      usefulness_rating: feedback.usefulness_rating,
      would_use_again: feedback.would_use_again,
      willingness_to_pay: feedback.willingness_to_pay,
    },
  });

  if (email) {
    await supabase.from("email_signups").insert({
      anonymous_user_id: feedback.anonymous_user_id,
      email,
      context: "feedback",
    });

    await supabase.from("events").insert({
      anonymous_user_id: feedback.anonymous_user_id,
      session_id: feedback.session_id,
      event_name: "left_email",
      metadata: { context: "feedback" },
    });
  }

  return NextResponse.json({ ok: true });
}
