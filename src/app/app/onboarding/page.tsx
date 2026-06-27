import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome to Introbase"
        description="Start with a quick guided demo, or jump straight into a blank import queue."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complete the demo tutorial</CardTitle>
            <CardDescription>
              Walk through the sample import and board flow before adding your
              own messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/demo/import?returnTo=/app/import"
              className={buttonVariants({ className: "w-full" })}
            >
              <PlayCircle className="size-4" />
              Start tutorial
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Open your workspace now with an empty import page ready for your
              real messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/app/import"
              className={buttonVariants({
                className: "w-full",
                variant: "outline",
              })}
            >
              Open blank workspace
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
