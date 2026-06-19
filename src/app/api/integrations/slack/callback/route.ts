import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import { verifyOAuthState } from "@/lib/integrations/oauthState";
import { exchangeSlackCode } from "@/lib/integrations/slack/oauth";
import { syncPrimarySlackAccount } from "@/lib/integrations/slack/sync";
import { encryptToken } from "@/lib/security/tokenCrypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function withStatusParam(path: string, status: string) {
  const url = new URL(path, "https://introbase.local");
  url.searchParams.set("slack", status);
  return `${url.pathname}${url.search}${url.hash}`;
}

function logSlackCallbackError(stage: string, error: unknown) {
  const supabaseError =
    error && typeof error === "object"
      ? (error as {
          code?: unknown;
          details?: unknown;
          hint?: unknown;
          message?: unknown;
        })
      : null;

  console.error("[slack_oauth_callback_failed]", {
    stage,
    message:
      error instanceof Error
        ? error.message
        : typeof supabaseError?.message === "string"
          ? supabaseError.message
          : "Unknown error",
    name: error instanceof Error ? error.name : typeof error,
    code: typeof supabaseError?.code === "string" ? supabaseError.code : null,
    details:
      typeof supabaseError?.details === "string" ? supabaseError.details : null,
    hint: typeof supabaseError?.hint === "string" ? supabaseError.hint : null,
  });
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
    return redirectTo(request, "/app/integrations?slack=cancelled");
  }

  if (!code || !state) {
    return redirectTo(request, "/app/integrations?slack=invalid_callback");
  }

  const verifiedState = verifyOAuthState(state, user.id);

  if (!verifiedState) {
    return redirectTo(request, "/app/integrations?slack=invalid_state");
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return redirectTo(request, "/app/integrations?slack=storage_not_configured");
  }

  try {
    const token = await exchangeSlackCode(code);
    const teamId = token.team?.id;
    const teamName = token.team?.name || "Slack workspace";

    if (!teamId || !token.access_token) {
      logSlackCallbackError("token_payload", new Error("Slack token response missing team or access token"));
      return redirectTo(request, "/app/integrations?slack=connect_failed");
    }

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "slack",
          provider_account_id: teamId,
          provider_account_email: "",
          display_name: teamName,
          workspace_name: teamName,
          workspace_id: teamId,
          access_token_encrypted: encryptToken(token.access_token),
          refresh_token_encrypted: null,
          token_expires_at: null,
          scopes: token.scope ? token.scope.split(",") : [],
          status: "connected",
          last_error: null,
          metadata: {
            botUserId: token.bot_user_id ?? "",
            authedUserId: token.authed_user?.id ?? "",
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider,provider_account_id",
        },
      );

    if (upsertError) {
      logSlackCallbackError("storage_upsert", upsertError);
      throw upsertError;
    }

    let status = "connected";
    try {
      await syncPrimarySlackAccount(supabase, user.id);
    } catch {
      status = "sync_failed";
    }

    return redirectTo(
      request,
      withStatusParam(sanitizeNextPath(verifiedState.nextPath), status),
    );
  } catch (error) {
    logSlackCallbackError("callback", error);
    return redirectTo(request, "/app/integrations?slack=connect_failed");
  }
}
