import { NextResponse } from "next/server";

import { mapUserToProfile } from "@/lib/auth/profile";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return redirectTo(request, "/login?error=oauth_cancelled");
  }

  const supabase = await createSupabaseServerAuthClient();

  if (!supabase) {
    return redirectTo(request, "/login?error=auth_not_configured");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo(request, "/login?error=oauth_exchange_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isNewUser = false;

  if (user) {
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    isNewUser = !profileLookupError && !existingProfile;

    await supabase.from("profiles").upsert(mapUserToProfile(user));
  }

  return redirectTo(request, isNewUser ? "/app/onboarding" : next);
}
