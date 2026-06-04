import { sanitizeNextPath } from "@/lib/auth/redirects";

export const SLACK_BOT_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:history",
  "im:read",
  "mpim:history",
  "mpim:read",
  "users:read",
  "team:read",
].join(",");

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getSlackOAuthConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: new URL("/api/integrations/slack/callback", getBaseUrl())
      .toString(),
  };
}

export function buildSlackOAuthUrl(input: {
  state: string;
  nextPath?: string | null;
}) {
  const config = getSlackOAuthConfig();

  if (!config) {
    throw new Error("Slack OAuth is not configured");
  }

  const url = new URL(SLACK_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", SLACK_BOT_SCOPES);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("next", sanitizeNextPath(input.nextPath));

  return url.toString();
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  scope?: string;
  bot_user_id?: string;
  team?: {
    id?: string;
    name?: string;
  };
  authed_user?: {
    id?: string;
  };
  error?: string;
}

export async function exchangeSlackCode(code: string) {
  const config = getSlackOAuthConfig();

  if (!config) {
    throw new Error("Slack OAuth is not configured");
  }

  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Slack token exchange failed");
  }

  const payload = (await response.json()) as SlackOAuthResponse;

  if (!payload.ok || !payload.access_token || !payload.team?.id) {
    throw new Error(payload.error || "Slack token exchange failed");
  }

  return payload;
}
