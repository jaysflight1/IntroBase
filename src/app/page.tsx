import {
  CalendarClock,
  Inbox,
  ListOrdered,
  MessageSquareReply,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { LandingActions } from "@/components/LandingActions";
import { BrandMark } from "@/components/LogoLink";
import { VisitLogger } from "@/components/VisitLogger";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import {
  getTimingBadgeClass,
  getTimingCardClass,
  getTimingLabel,
  getTimingVisual,
} from "@/lib/replyTiming";
import { cn } from "@/lib/utils";
import type { Urgency } from "@/types";

const previewColumns: {
  timing: Urgency;
  title: string;
  score: number;
  cards: { sender: string; detail: string; summary: string; tag: string }[];
}[] = [
  {
    timing: "today",
    title: "Today",
    score: 96,
    cards: [
      {
        sender: "Maya Chen",
        detail: "Partner · Forward Accelerator",
        summary: "Wants to discuss a pilot with their current cohort.",
        tag: "Pilot",
      },
    ],
  },
  {
    timing: "this_week",
    title: "This week",
    score: 82,
    cards: [
      {
        sender: "Daniel Osei",
        detail: "Investor · Crane Capital",
        summary: "Asked for the latest deck before partner meeting Friday.",
        tag: "Investor",
      },
    ],
  },
  {
    timing: "this_month",
    title: "This month",
    score: 61,
    cards: [
      {
        sender: "Priya Nair",
        detail: "Recruiter · Atlas",
        summary: "Senior role intro — worth a call once the sprint ships.",
        tag: "Career",
      },
    ],
  },
  {
    timing: "later",
    title: "Later",
    score: 18,
    cards: [
      {
        sender: "Outbound SaaS pitch",
        detail: "Cold email",
        summary: "Generic tooling pitch with no relevance right now.",
        tag: "Low fit",
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

export default async function Home() {
  const user = await getCurrentUser();
  const isSignedIn = Boolean(user);

  return (
    <div className="min-h-screen bg-landing-shell text-foreground">
      <VisitLogger eventName="visited_landing" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <LandingActions compact isSignedIn={isSignedIn} />
        </div>
      </header>

      <main>
          <section className="relative">
            <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-center px-4 py-8 text-center sm:px-6 lg:py-10">
              <div className="relative z-10">
                <h1 className="mx-auto max-w-5xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl lg:whitespace-nowrap lg:text-[52px] xl:text-6xl">
                  Know exactly who to reply to first.
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                  IntroBase turns scattered inbound into a ranked reply board,
                  showing what is urgent, why it matters, and the next response
                  to send.
                </p>
                <div className="mt-6 flex justify-center">
                  <LandingActions isSignedIn={isSignedIn} />
                </div>
              </div>

              <div className="relative z-10 mt-8">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-3">
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-3">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-blue-400" />
                  </div>
                  <div className="grid gap-3 rounded-xl bg-slate-50/80 p-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                    {previewColumns.map((column, index) => (
                      <div
                        key={column.title}
                        className="group rounded-xl border border-white bg-white/75 p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10 focus-within:-translate-y-1 focus-within:shadow-lg"
                      >
                        <button
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-1 pb-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          type="button"
                        >
                          <span>
                            <span className="text-xs font-semibold">
                              {column.title}
                            </span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              Priority score {column.score}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "size-2.5 rounded-full transition-transform group-hover:scale-125",
                              getTimingVisual(column.timing).dot,
                            )}
                          />
                        </button>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full landing-score-bar",
                              getTimingVisual(column.timing).bar,
                            )}
                            style={{
                              width: `${column.score}%`,
                              animationDelay: `${index * 160}ms`,
                            }}
                          />
                        </div>
                        {column.cards.map((card) => (
                          <div
                            key={card.sender}
                            className={cn(
                              "mt-3 rounded-lg border border-border/70 bg-card p-3 shadow-xs transition duration-300 group-hover:border-foreground/15",
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
                            <span className="mt-3 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {card.tag}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

        <section className="border-y border-border/60 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Turn chaos into a ranked reply queue
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
              turns the chaos into a ranked queue of what matters, so the
              investor intro never sits unread under a newsletter.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Privacy-first beta</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              IntroBase analyzes the messages you provide to prioritize
              replies. Message content may be sent to OpenAI for analysis and
              stored in your account so you can view your board. We don&apos;t
              sell your data or use your messages for advertising.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl bg-foreground px-6 py-14 text-center text-background">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Stop losing opportunities in your inbox.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-80">
              {isSignedIn
                ? "Open your workspace, or try the sample inbox in under a minute."
                : "Sign in with Google, then try the sample inbox in under a minute."}
            </p>
            <div className="mt-7 flex justify-center">
              <LandingActions inverted isSignedIn={isSignedIn} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <BrandMark />
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:items-end">
            <p>
              © {new Date().getFullYear()} Introbase. Built for founders who
              cannot afford to miss inbound.
            </p>
            <Link
              href="/privacy"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
