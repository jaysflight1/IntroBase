import { Inbox, LockKeyhole, MessageSquareText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const integrations = [
  {
    title: "Gmail",
    description:
      "Read-only inbox sync will import recent emails and prioritize them automatically.",
    icon: Inbox,
  },
  {
    title: "Slack",
    description:
      "Workspace sync will import authorized messages with channel and DM context.",
    icon: MessageSquareText,
  },
];

export default function IntegrationsPage() {
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

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;

          return (
            <Card key={integration.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="size-5" />
                  {integration.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {integration.description}
                </p>
                <Button variant="outline" disabled>
                  <LockKeyhole className="size-4" />
                  Coming next
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
