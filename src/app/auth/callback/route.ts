import { NextResponse } from "next/server";

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

  if (user) {
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === "string"
            ? user.user_metadata.name
            : null,
      avatar_url:
        typeof user.user_metadata.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : typeof user.user_metadata.picture === "string"
            ? user.user_metadata.picture
            : null,
      updated_at: new Date().toISOString(),
    });
  }

  return redirectTo(request, next);
}
