import { Mail, ShieldCheck, UserCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage the Google account used to sign in to Introbase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="size-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCircle className="size-4 text-primary" />
              Name
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{displayName}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4 text-primary" />
              Email
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {user?.email ?? "Not signed in"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Google sign-in identifies your Introbase account. Gmail inbox access
            is separate and will be requested only from the Gmail integration
            flow.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data controls</CardTitle>
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
