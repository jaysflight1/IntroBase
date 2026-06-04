import { NextResponse } from "next/server";

import { createOAuthState } from "@/lib/integrations/oauthState";
import { buildGmailOAuthUrl } from "@/lib/integrations/gmail/oauth";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/app/integrations", request.url));
  }

  const nextPath =
    new URL(request.url).searchParams.get("next") ?? "/app/integrations";

  try {
    const state = createOAuthState(user.id, nextPath);
    return NextResponse.redirect(
      buildGmailOAuthUrl({
        state,
        loginHint: user.email,
        nextPath,
        forceConsent: true,
      }),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/app/integrations?gmail=not_configured", request.url),
    );
  }
}
