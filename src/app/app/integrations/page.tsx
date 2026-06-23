import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Unplug,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { cn } from "@/lib/utils";

const successStatusKeys = new Set([
  "connected",
  "synced",
  "disconnected",
]);

function StatusBanner({ message, success }: { message: string; success: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm",
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {success ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

function ConnectionStatusPill({ account }: { account: ConnectedAccountRow | null }) {
  if (!account) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Not connected
      </span>
    );
  }

  const healthy = account.status === "connected" && !account.last_error;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        healthy
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {healthy ? "Connected" : account.status.replaceAll("_", " ")}
    </span>
  );
}

interface ConnectedAccountRow {
  provider_account_email: string | null;
  workspace_name: string | null;
  scopes: string[] | null;
  status: string;
  last_successful_sync_at: string | null;
  last_error: string | null;
}

const gmailStatusMessages: Record<string, string> = {
  connected: "Gmail connected. Syncing your latest emails can start now.",
  cancelled: "Gmail connection was cancelled.",
  invalid_callback: "Google returned an incomplete Gmail callback.",
  invalid_state: "Gmail connection expired. Try connecting again.",
  missing_refresh_token:
    "Google did not return offline access. Try reconnecting Gmail.",
  connect_failed: "Introbase could not connect Gmail. Try again.",
  disconnected: "Gmail disconnected.",
  labels_disabled:
    "Gmail labeling is disabled because IntroBase now requests read-only Gmail access.",
  not_connected: "Connect Gmail before syncing.",
  not_configured: "Gmail OAuth is not configured for this environment.",
  storage_not_configured: "Supabase storage is not configured.",
  synced: "Gmail sync finished. New priority messages are on your board.",
  sync_failed: "Gmail sync failed. Try reconnecting Gmail.",
};

const slackStatusMessages: Record<string, string> = {
  connected: "Slack connected. Run a sync to import authorized messages.",
  cancelled: "Slack connection was cancelled.",
  invalid_callback: "Slack returned an incomplete callback.",
  invalid_state: "Slack connection expired. Try connecting again.",
  connect_failed: "Introbase could not connect Slack. Try again.",
  disconnected: "Slack disconnected.",
  not_connected: "Connect Slack before syncing.",
  not_configured: "Slack OAuth is not configured for this environment.",
  storage_not_configured: "Supabase storage is not configured.",
  synced: "Slack sync finished. New priority messages are on your board.",
  sync_failed: "Slack sync failed. Check permissions or reconnect Slack.",
};

async function getConnectedAccount(userId: string, provider: "gmail" | "slack") {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("connected_accounts")
    .select(
      "provider_account_email, workspace_name, scopes, status, last_successful_sync_at, last_error",
    )
    .eq("user_id", userId)
    .eq("provider", provider)
    .neq("status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<ConnectedAccountRow>();

  return data;
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ gmail?: string; slack?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const slackAccount = user ? await getConnectedAccount(user.id, "slack") : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect Slack to import authorized messages and prioritize them on your board."
      />

      {params?.gmail ? (
        <StatusBanner
          message={gmailStatusMessages[params.gmail] ?? "Gmail status updated."}
          success={successStatusKeys.has(params.gmail)}
        />
      ) : null}

      {params?.slack ? (
        <StatusBanner
          message={slackStatusMessages[params.slack] ?? "Slack status updated."}
          success={successStatusKeys.has(params.slack)}
        />
      ) : null}

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-border/80 bg-muted/50">
                <MessageSquareText className="size-4.5" />
              </span>
              <CardTitle>Slack</CardTitle>
            </div>
            <CardAction>
              <ConnectionStatusPill account={slackAccount} />
            </CardAction>
            <CardDescription className="mt-1">
              Workspace sync imports authorized messages with channel and DM
              context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slackAccount ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Workspace</dt>
                  <dd className="truncate font-medium">
                    {slackAccount.workspace_name ?? "Slack connected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Last sync</dt>
                  <dd>
                    {slackAccount.last_successful_sync_at
                      ? new Date(
                          slackAccount.last_successful_sync_at,
                        ).toLocaleString()
                      : "Never"}
                  </dd>
                </div>
                {slackAccount.last_error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    {slackAccount.last_error}
                  </p>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Read-only. Introbase can only analyze conversations your Slack
                app installation is allowed to access.
              </p>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            {slackAccount ? (
              <>
                <form action="/api/integrations/slack/sync-now" method="post">
                  <Button type="submit">
                    <RefreshCw className="size-4" />
                    Sync now
                  </Button>
                </form>
                <form action="/api/integrations/slack/disconnect" method="post">
                  <Button type="submit" variant="outline">
                    <Unplug className="size-4" />
                    Disconnect
                  </Button>
                </form>
              </>
            ) : (
              <Link
                href="/api/integrations/slack/connect"
                className={cn(buttonVariants(), "gap-2")}
              >
                Connect Slack
              </Link>
            )}
          </CardFooter>
        </Card>

        <Card className="bg-muted/40 text-muted-foreground opacity-75">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-border/80 bg-muted/50">
                <Inbox className="size-4.5" />
              </span>
              <CardTitle>Gmail</CardTitle>
            </div>
            <CardAction>
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Coming soon
              </span>
            </CardAction>
            <CardDescription className="mt-1">
              Gmail inbox sync is not available yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6">
              Gmail support is being prepared for a later release. For now, use
              Slack or paste messages manually from the Import page.
            </p>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" disabled>
              Connect Gmail
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
