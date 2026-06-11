import { sanitizeNextPath } from "@/lib/auth/redirects";

export const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_GMAIL_PROFILE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/profile";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getGmailOAuthConfig() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: new URL("/api/integrations/gmail/callback", getBaseUrl())
      .toString(),
  };
}

export function buildGmailOAuthUrl(input: {
  state: string;
  loginHint?: string | null;
  nextPath?: string | null;
  forceConsent?: boolean;
}) {
  const config = getGmailOAuthConfig();

  if (!config) {
    throw new Error("Gmail OAuth is not configured");
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_MODIFY_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);
  url.searchParams.set("prompt", input.forceConsent ? "consent" : "select_account");
  url.searchParams.set("next", sanitizeNextPath(input.nextPath));

  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }

  return url.toString();
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeGmailCode(code: string) {
  const config = getGmailOAuthConfig();

  if (!config) {
    throw new Error("Gmail OAuth is not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGmailAccessToken(refreshToken: string) {
  const config = getGmailOAuthConfig();

  if (!config) {
    throw new Error("Gmail OAuth is not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token refresh failed");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGmailProfile(accessToken: string) {
  const response = await fetch(GOOGLE_GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Gmail profile request failed");
  }

  return (await response.json()) as {
    emailAddress: string;
    messagesTotal?: number;
    threadsTotal?: number;
    historyId?: string;
  };
}
