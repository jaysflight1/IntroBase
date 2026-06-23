import {
  CalendarClock,
  Inbox,
  ListOrdered,
  MessageSquareReply,
  ShieldCheck,
} from "lucide-react";

import { LandingActions } from "@/components/LandingActions";
import { BrandMark } from "@/components/LogoLink";
import { VisitLogger } from "@/components/VisitLogger";
import {
  getTimingBadgeClass,
  getTimingCardClass,
  getTimingLabel,
} from "@/lib/replyTiming";
import { cn } from "@/lib/utils";
import type { Urgency } from "@/types";

const previewColumns: {
  timing: Urgency;
  title: string;
  cards: { sender: string; detail: string; summary: string }[];
}[] = [
  {
    timing: "today",
    title: "Today",
    cards: [
      {
        sender: "Maya Chen",
        detail: "Partner · Forward Accelerator",
        summary: "Wants to discuss a pilot with their current cohort.",
      },
    ],
  },
  {
    timing: "this_week",
    title: "This week",
    cards: [
      {
        sender: "Daniel Osei",
        detail: "Investor · Crane Capital",
        summary: "Asked for the latest deck before partner meeting Friday.",
      },
    ],
  },
  {
    timing: "this_month",
    title: "This month",
    cards: [
      {
        sender: "Priya Nair",
        detail: "Recruiter · Atlas",
        summary: "Senior role intro — worth a call once the sprint ships.",
      },
    ],
  },
  {
    timing: "later",
    title: "Later",
    cards: [
      {
        sender: "Outbound SaaS pitch",
        detail: "Cold email",
        summary: "Generic tooling pitch with no relevance right now.",
      },
    ],
  },
];

const steps = [
  {
    icon: Inbox,
    title: "Bring in your inbound",
    description:
      "Paste emails, DMs, and Slack messages. Gmail and Slack integrations are optional.",
  },
  {
    icon: ListOrdered,
    title: "Introbase ranks every message",
    description:
      "Each message is scored on opportunity value, urgency, relationship, and deadlines.",
  },
  {
    icon: MessageSquareReply,
    title: "Reply to the right people first",
    description:
      "A single board shows who needs a reply today, with a suggested response ready to copy.",
  },
  {
    icon: CalendarClock,
    title: "Never drop a follow-up",
    description:
      "Lightweight follow-up tracking keeps next steps visible until they are done.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-landing-shell text-foreground">
      <VisitLogger eventName="visited_landing" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <LandingActions compact />
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Know exactly who to reply to first.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Introbase turns scattered inbound — email, LinkedIn, Slack, DMs —
            into a single board ranked by urgency, with suggested replies and
            follow-ups built in.
          </p>
          <div className="mt-8 flex justify-center">
            <LandingActions />
          </div>

          <div className="mt-16 rounded-2xl border border-border/70 bg-card p-2 shadow-xl shadow-primary/5 sm:p-3">
            <div className="flex items-center gap-1.5 px-2 pt-1 pb-3">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
            </div>
            <div className="grid gap-3 rounded-xl bg-muted/40 p-3 text-left sm:grid-cols-2 lg:grid-cols-4">
              {previewColumns.map((column) => (
                <div key={column.title}>
                  <div className="flex items-center px-1 pb-2">
                    <p className="text-xs font-semibold">{column.title}</p>
                  </div>
                  {column.cards.map((card) => (
                    <div
                      key={card.sender}
                      className={cn(
                        "rounded-lg border border-border/70 bg-card p-3 shadow-xs",
                        getTimingCardClass(column.timing),
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {card.sender}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            getTimingBadgeClass(column.timing),
                          )}
                        >
                          {getTimingLabel(column.timing)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {card.detail}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/80">
                        {card.summary}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              From chaos to a ranked reply queue
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="rounded-xl border border-border/70 bg-card p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-lg border border-border/80 bg-muted/50">
                        <Icon className="size-4.5 text-foreground/70" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your important messages are scattered.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Founders and builders miss opportunities because inbound lives
              across email, LinkedIn, Slack, Discord, texts, and DMs. Introbase
              turns the chaos into a ranked queue of what matters — so the
              investor intro never sits unread under a newsletter.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Privacy-first beta</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              For the beta, you paste messages manually or connect read-only
              integrations. Introbase does not store your raw pasted messages
              server-side by default; your analysis is saved locally in your
              browser.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl bg-foreground px-6 py-14 text-center text-background">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Stop losing opportunities in your inbox.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-80">
              Sign in with Google, then try the sample inbox in under a minute.
            </p>
            <div className="mt-7 flex justify-center">
              <LandingActions inverted />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <BrandMark />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Introbase. Built for founders who
            cannot afford to miss inbound.
          </p>
        </div>
      </footer>
    </div>
  );
}
