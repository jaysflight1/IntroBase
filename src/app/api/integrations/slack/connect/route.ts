import { NextResponse } from "next/server";

import { createOAuthState } from "@/lib/integrations/oauthState";
import { buildSlackOAuthUrl } from "@/lib/integrations/slack/oauth";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/app/integrations", request.url),
    );
  }

  const nextPath =
    new URL(request.url).searchParams.get("next") ?? "/app/integrations";

  try {
    const state = createOAuthState(user.id, nextPath);
    return NextResponse.redirect(buildSlackOAuthUrl({ state, nextPath }));
  } catch {
    return NextResponse.redirect(
      new URL("/app/integrations?slack=not_configured", request.url),
    );
  }
}
