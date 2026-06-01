import { CheckCircle2 } from "lucide-react";

import { LandingActions } from "@/components/LandingActions";
import { LogoLink } from "@/components/LogoLink";
import { VisitLogger } from "@/components/VisitLogger";
import { getLaneVisualByTitle, getPriorityBadgeClass } from "@/lib/laneStyles";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types";

const demoCards = [
  { lane: "Reply now", title: "Accelerator pilot request", priority: "high" as const },
  { lane: "This week", title: "Investor wants a deck", priority: "high" as const },
  {
    lane: "Follow up later",
    title: "Recruiter opportunity",
    priority: "medium" as const,
  },
  { lane: "Low priority", title: "Generic outbound pitch", priority: "low" as const },
] as const;

const features = [
  [
    "Paste messy inbound",
    "Emails, DMs, Slack, Discord, texts, and connection requests.",
    "from-primary to-chart-2",
  ],
  [
    "Introbase ranks each message",
    "See opportunity value, urgency, relationship importance, and deadlines.",
    "from-chart-2 to-chart-3",
  ],
  [
    "See who to reply to first",
    "A simple priority board replaces scattered context switching.",
    "from-chart-3 to-chart-4",
  ],
  [
    "Draft replies and track follow-ups",
    "Copy concise replies and keep lightweight next steps visible.",
    "from-chart-4 to-chart-5",
  ],
] as const;

const priorityLabels: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-landing-shell text-foreground">
      <VisitLogger eventName="visited_landing" />
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <LogoLink />
          <LandingActions compact />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              AI command center for your{" "}
              <span className="text-brand-gradient">inbound</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Introbase prioritizes your messages, contacts, and follow-ups so
              you know exactly who to reply to first.
            </p>
            <div className="mt-8">
              <LandingActions />
            </div>
          </div>

          <div className="surface-card-muted p-4 ring-1 ring-primary/10">
            <div className="space-y-3">
              {demoCards.map(({ lane, title, priority }) => {
                const visual = getLaneVisualByTitle(lane);

                return (
                  <div
                    key={title}
                    className="surface-card overflow-hidden p-0 transition-shadow hover:shadow-md"
                  >
                    <div className={cn("h-1 w-full", visual.dot)} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            visual.accent,
                          )}
                        >
                          {lane}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                            getPriorityBadgeClass(priority),
                          )}
                        >
                          {priorityLabels[priority]}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Suggested action: reply with a short next-step ask.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-white/50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4">
            {features.map(([title, description, gradient]) => (
              <div key={title}>
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm",
                    gradient,
                  )}
                >
                  <CheckCircle2 className="size-5 text-white" />
                </div>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your important messages are scattered.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Founders and builders miss opportunities because inbound lives
              across email, LinkedIn, Slack, Discord, texts, and DMs. Introbase
              turns the chaos into a ranked queue of what matters.
            </p>
          </div>
          <div className="surface-card border-primary/15 bg-gradient-to-br from-primary/5 via-card to-chart-3/5 p-6">
            <h2 className="font-semibold text-primary">Privacy-first beta</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              For the beta, you paste messages manually. Introbase does not
              store your raw pasted messages server-side by default; your
              analysis is saved locally in your browser.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
