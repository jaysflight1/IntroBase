import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?error=auth_not_configured", request.url),
      303,
    );
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=signout_failed", request.url),
      303,
    );
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
