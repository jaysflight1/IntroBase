import Link from "next/link";
import {
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Unplug,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { cn } from "@/lib/utils";

interface GmailAccountRow {
  provider_account_email: string | null;
  status: string;
  last_successful_sync_at: string | null;
  last_error: string | null;
}

const slackIntegration = {
  title: "Slack",
  description:
    "Workspace sync will import authorized messages with channel and DM context.",
  icon: MessageSquareText,
};

const statusMessages: Record<string, string> = {
  connected: "Gmail connected. Syncing your latest emails can start now.",
  cancelled: "Gmail connection was cancelled.",
  invalid_callback: "Google returned an incomplete Gmail callback.",
  invalid_state: "Gmail connection expired. Try connecting again.",
  missing_refresh_token:
    "Google did not return offline access. Try reconnecting Gmail.",
  connect_failed: "Introbase could not connect Gmail. Try again.",
  disconnected: "Gmail disconnected.",
  not_connected: "Connect Gmail before syncing.",
  not_configured: "Gmail OAuth is not configured for this environment.",
  storage_not_configured: "Supabase storage is not configured.",
  synced: "Gmail sync finished. New priority messages are on your board.",
  sync_failed: "Gmail sync failed. Try reconnecting Gmail.",
};

async function getGmailAccount(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("connected_accounts")
    .select(
      "provider_account_email, status, last_successful_sync_at, last_error",
    )
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<GmailAccountRow>();

  return data;
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ gmail?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const gmailAccount = user ? await getGmailAccount(user.id) : null;
  const gmailStatus = params?.gmail;
  const SlackIcon = slackIntegration.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect your inboxes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Start with sign-in now. Gmail and Slack connection controls will live
          here as read-only integrations.
        </p>
      </div>

      {gmailStatus ? (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {statusMessages[gmailStatus] ?? "Gmail status updated."}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-5" />
              Gmail
            </CardTitle>
            <CardDescription>
              Read-only inbox sync imports recent emails and prioritizes them
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gmailAccount ? (
              <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  {gmailAccount.provider_account_email ?? "Gmail connected"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Status: {gmailAccount.status.replaceAll("_", " ")}
                </p>
                {gmailAccount.last_successful_sync_at ? (
                  <p className="mt-1 text-muted-foreground">
                    Last sync:{" "}
                    {new Date(
                      gmailAccount.last_successful_sync_at,
                    ).toLocaleString()}
                  </p>
                ) : null}
                {gmailAccount.last_error ? (
                  <p className="mt-2 text-destructive">
                    {gmailAccount.last_error}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Read-only. Introbase cannot send, delete, archive, or modify
                emails.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {gmailAccount ? (
                <>
                  <form action="/api/integrations/gmail/sync-now" method="post">
                    <Button type="submit">
                      <RefreshCw className="size-4" />
                      Sync now
                    </Button>
                  </form>
                  <form
                    action="/api/integrations/gmail/disconnect"
                    method="post"
                  >
                    <Button type="submit" variant="outline">
                      <Unplug className="size-4" />
                      Disconnect
                    </Button>
                  </form>
                </>
              ) : (
                <Link
                  href="/api/integrations/gmail/connect"
                  className={cn(buttonVariants(), "gap-2")}
                >
                  <Inbox className="size-4" />
                  Connect Gmail
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlackIcon className="size-5" />
              {slackIntegration.title}
            </CardTitle>
            <CardDescription>{slackIntegration.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              <Loader2 className="size-4" />
              Coming next
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
