import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/app/integrations", request.url), 303);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/app/integrations?gmail=storage_not_configured", request.url),
      303,
    );
  }

  await supabase
    .from("connected_accounts")
    .update({
      status: "disconnected",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("provider", "gmail");

  return NextResponse.redirect(
    new URL("/app/integrations?gmail=disconnected", request.url),
    303,
  );
}
