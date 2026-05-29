import { CheckCircle2 } from "lucide-react";

import { LandingActions } from "@/components/LandingActions";
import { VisitLogger } from "@/components/VisitLogger";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <VisitLogger eventName="visited_landing" />
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="text-lg font-semibold tracking-tight">Introbase</div>
          <LandingActions />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-blue-700">
              No inbox connection required
            </p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              AI command center for your inbound.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
              Introbase prioritizes your messages, contacts, and follow-ups so
              you know exactly who to reply to first.
            </p>
            <div className="mt-8">
              <LandingActions />
            </div>
          </div>

          <div className="rounded-lg border bg-zinc-50 p-4 shadow-sm">
            <div className="space-y-3">
              {[
                ["Reply now", "Accelerator pilot request", "High"],
                ["This week", "Investor wants a deck", "High"],
                ["Follow up later", "Recruiter opportunity", "Medium"],
                ["Low priority", "Generic outbound pitch", "Low"],
              ].map(([lane, title, priority]) => (
                <div key={title} className="rounded-md border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      {lane}
                    </p>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                      {priority}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Suggested action: reply with a short next-step ask.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-zinc-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4">
            {[
              ["Paste messy inbound", "Emails, DMs, Slack, Discord, texts, and connection requests."],
              ["Introbase ranks each message", "See opportunity value, urgency, relationship importance, and deadlines."],
              ["See who to reply to first", "A simple priority board replaces scattered context switching."],
              ["Draft replies and track follow-ups", "Copy concise replies and keep lightweight next steps visible."],
            ].map(([title, description]) => (
              <div key={title}>
                <CheckCircle2 className="size-5 text-blue-700" />
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
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
            <p className="mt-4 leading-7 text-zinc-600">
              Founders and builders miss opportunities because inbound lives
              across email, LinkedIn, Slack, Discord, texts, and DMs. Introbase
              turns the chaos into a ranked queue of what matters.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h2 className="font-semibold">Privacy-first beta</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
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
