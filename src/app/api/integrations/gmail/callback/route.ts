import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import {
  exchangeGmailCode,
  fetchGmailProfile,
  GMAIL_READONLY_SCOPE,
} from "@/lib/integrations/gmail/oauth";
import { verifyOAuthState } from "@/lib/integrations/oauthState";
import { encryptToken } from "@/lib/security/tokenCrypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function withStatusParam(path: string, status: string) {
  const url = new URL(path, "https://introbase.local");
  url.searchParams.set("gmail", status);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const user = await getCurrentUser();

  if (!user) {
    return redirectTo(request, "/login?next=/app/integrations");
  }

  if (error) {
    return redirectTo(request, "/app/integrations?gmail=cancelled");
  }

  if (!code || !state) {
    return redirectTo(request, "/app/integrations?gmail=invalid_callback");
  }

  const verifiedState = verifyOAuthState(state, user.id);

  if (!verifiedState) {
    return redirectTo(request, "/app/integrations?gmail=invalid_state");
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return redirectTo(request, "/app/integrations?gmail=storage_not_configured");
  }

  try {
    const token = await exchangeGmailCode(code);
    const profile = await fetchGmailProfile(token.access_token);

    if (!token.refresh_token) {
      return redirectTo(request, "/app/integrations?gmail=missing_refresh_token");
    }

    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "gmail",
          provider_account_id: profile.emailAddress,
          provider_account_email: profile.emailAddress,
          display_name: profile.emailAddress,
          access_token_encrypted: encryptToken(token.access_token),
          refresh_token_encrypted: encryptToken(token.refresh_token),
          token_expires_at: expiresAt,
          scopes: [GMAIL_READONLY_SCOPE],
          status: "connected",
          last_error: null,
          metadata: {
            gmailHistoryId: profile.historyId ?? "",
            messagesTotal: profile.messagesTotal ?? null,
            threadsTotal: profile.threadsTotal ?? null,
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider,provider_account_id",
        },
      );

    if (upsertError) {
      throw upsertError;
    }

    return redirectTo(
      request,
      withStatusParam(sanitizeNextPath(verifiedState.nextPath), "connected"),
    );
  } catch {
    return redirectTo(request, "/app/integrations?gmail=connect_failed");
  }
}
