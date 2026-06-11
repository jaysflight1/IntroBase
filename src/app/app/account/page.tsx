import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteDataButton } from "@/app/app/account/DeleteDataButton";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const displayName =
    typeof user?.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata.name === "string"
        ? user.user_metadata.name
        : "Introbase user";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Manage the Google account used to sign in to Introbase."
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email ?? "Not signed in"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <CardTitle>Access</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Google sign-in identifies your Introbase account. Gmail inbox access
            is separate and will be requested only from the Gmail integration
            flow.
          </p>
        </CardContent>
      </Card>

      <Card className="ring-destructive/20">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently remove your data from Introbase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Delete imported Gmail and Slack messages, analysis, integration
            tokens, saved contacts, follow-ups, and local browser data. This
            does not delete your Google sign-in account.
          </p>
          <DeleteDataButton />
        </CardContent>
      </Card>
    </div>
  );
}
