import type { Metadata } from "next";
import Link from "next/link";

import { LandingActions } from "@/components/LandingActions";
import { BrandMark } from "@/components/LogoLink";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: "Privacy Policy | IntroBase",
  description: "How IntroBase collects, uses, stores, and protects data.",
};

const lastUpdated = "June 27, 2026";

const sections = [
  {
    title: "Overview",
    body: [
      "IntroBase helps users prioritize inbound messages, understand deadlines, generate suggested replies, and track contacts and follow-ups. To do that, IntroBase processes the account information, messages, integration data, and usage information described below.",
      "This Privacy Policy explains how IntroBase collects, uses, stores, shares, and protects information when you use the website, demo, app, and integrations. It is intended to be read together with any additional notices shown in the product.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Account information: when you sign in, we may collect your email address, name, avatar, authentication identifiers, and related profile information provided by your sign-in provider.",
      "Messages and analysis data: when you paste messages or connect an integration, we may process message text, senders, subjects, timestamps, source labels, notes, extracted contacts, suggested replies, deadlines, priority labels, categories, follow-ups, and board edits.",
      "Integration information: if you connect Slack or another supported integration, we may collect workspace or account identifiers, authorized message metadata and content, scopes, sync status, and encrypted access or refresh tokens needed to operate the integration. Gmail support may be offered later and will request access separately if enabled.",
      "Usage and diagnostics: we collect product events such as page views, message creation, analysis attempts, analysis success or failure, feature usage, repeat usage, feedback, anonymous browser identifiers, session identifiers, model diagnostics, and basic operational logs.",
      "Feedback and communications: if you submit feedback or contact IntroBase, we may collect the information you choose to provide, including contact details.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use information to provide and improve IntroBase, including analyzing messages, ranking urgency, generating suggested replies, showing boards and contacts, syncing authorized integrations, saving user preferences, troubleshooting errors, protecting the service, understanding aggregate product usage, and responding to requests.",
      "We do not sell your personal information. We do not use your message content for advertising. We do not use your message content to build advertising profiles.",
      "We may use aggregated or de-identified information to understand product performance and improve IntroBase, as long as that information does not reasonably identify you.",
    ],
  },
  {
    title: "AI processing",
    body: [
      "IntroBase may send message content, sender/source context, and user-provided goals to OpenAI so OpenAI can return structured classifications, deadlines, suggested actions, and suggested replies.",
      "OpenAI acts as a service provider for this processing. IntroBase does not permit OpenAI or other AI providers to use your message content for advertising. IntroBase does not use your private messages to train its own general-purpose model unless we separately ask for and receive permission.",
      "AI output can be wrong or incomplete. You should review suggested replies and priority recommendations before relying on them.",
    ],
  },
  {
    title: "Google and Gmail data",
    body: [
      "Google sign-in is used to identify your IntroBase account. Gmail access, if offered and enabled, is separate from Google sign-in and will be requested through a dedicated integration flow.",
      "If you authorize Gmail access, IntroBase will use Google user data only to provide user-facing features you request, such as importing authorized messages, analyzing them, and displaying prioritized results. IntroBase will not sell Google user data, use it for advertising, or transfer it except as needed to provide the app, comply with law, protect security, or with your consent.",
      "IntroBase's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Google Workspace API data is not used to develop, improve, or train generalized AI or machine learning models.",
    ],
  },
  {
    title: "Slack and other integrations",
    body: [
      "If you connect Slack, IntroBase uses the permissions you authorize to import and analyze messages from authorized Slack workspaces, conversations, or events. IntroBase cannot access Slack content outside the permissions granted to the app.",
      "You can disconnect integrations from the app. Disconnecting stops future syncs, but previously imported messages or analysis may remain until you delete them or delete your IntroBase data.",
    ],
  },
  {
    title: "Storage and retention",
    body: [
      "IntroBase may store account profiles, connected account records, encrypted integration tokens, imported source messages, analyzed messages, saved contacts, follow-ups, feedback, and aggregate usage metrics in service databases. Some app data may also be stored locally in your browser so the product can load quickly.",
      "We keep information for as long as reasonably necessary to provide IntroBase, maintain security, comply with legal obligations, resolve disputes, and operate the service. You may delete account data from the Account page where available, or contact us to request deletion.",
      "Deleting browser data, using another browser, or clearing local storage may remove local app state from that device without deleting server-side account data.",
    ],
  },
  {
    title: "How we share information",
    body: [
      "We share information with service providers that help us operate IntroBase, such as hosting, database, authentication, analytics, AI processing, and integration providers. Current providers may include Vercel, Supabase, OpenAI, Google, Slack, and similar infrastructure vendors.",
      "We may disclose information if required by law, legal process, or a good-faith belief that disclosure is necessary to protect rights, safety, security, users, or the service.",
      "If IntroBase is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction, subject to this Privacy Policy or a replacement policy disclosed to users.",
    ],
  },
  {
    title: "Security",
    body: [
      "IntroBase uses reasonable technical and organizational safeguards designed to protect information, including authentication, row-level access controls where applicable, encrypted integration token storage, and limited administrative access.",
      "No internet service can guarantee perfect security. Please avoid submitting information you do not want processed by IntroBase, and review AI-generated content before sending it to others.",
    ],
  },
  {
    title: "Your choices and rights",
    body: [
      "You can choose not to paste messages, not to connect integrations, or to disconnect integrations at any time. You can also delete local browser data from your browser settings.",
      "Where available, the Account page lets authenticated users delete IntroBase account data, including imported integration messages, analysis, integration tokens, saved contacts, and follow-ups. Some aggregate or de-identified metrics and legally required records may be retained.",
      "Depending on where you live, you may have rights to request access, correction, deletion, portability, restriction, or objection to certain processing. You may also have the right to appeal or complain to a regulator. IntroBase will respond to applicable privacy requests as required by law.",
    ],
  },
  {
    title: "Children",
    body: [
      "IntroBase is not intended for children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to IntroBase, contact us so we can take appropriate action.",
    ],
  },
  {
    title: "International users",
    body: [
      "IntroBase is operated from the United States. If you use IntroBase from outside the United States, your information may be processed in the United States or other countries where our service providers operate. Those countries may have privacy laws different from your location.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. If we make material changes, we will update the effective date and provide additional notice when required by law.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or requests, contact the IntroBase team through the support channel where you received access to the product. If a dedicated privacy email is added later, this policy will be updated to list it.",
    ],
  },
];

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  const isSignedIn = Boolean(user);

  return (
    <div className="min-h-screen bg-landing-shell text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <LandingActions compact isSignedIn={isSignedIn} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            This policy describes how IntroBase handles information when you use
            the website, demo, app, and integrations.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl bg-white p-6 ring-1 ring-border/70">
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border/70 bg-card p-5 text-sm leading-6 text-muted-foreground">
          This policy is provided for transparency and is not a substitute for
          legal advice. For a formal compliance review, consult privacy counsel
          familiar with your users, vendors, and jurisdictions.
        </div>
      </main>

      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <BrandMark />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
