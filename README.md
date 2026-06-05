# Introbase

Introbase is an AI command center for inbound messages. It helps founders and busy builders turn scattered emails, DMs, Slack messages, Discord messages, texts, and connection requests into a prioritized reply board with suggested actions, draft replies, contacts, and follow-ups.

The app is built as a privacy-conscious beta: manual pasted message analysis keeps raw pasted text out of Supabase by default, while optional Gmail and Slack integrations can import authorized messages for authenticated users.

## Features

- Landing page with product positioning, sample priority cards, and anonymous visit logging.
- Supabase Auth with Google sign-in, protected `/app` routes, profile creation, and sign-out.
- Manual message import at `/app/import` with goal/context controls, sample inbox loading, a 25,000 character beta limit, and local draft persistence.
- AI-assisted analysis through OpenAI `gpt-4.1-mini` when `OPENAI_API_KEY` is configured, with a local heuristic fallback when it is not.
- Priority board at `/app/board` grouped by reply timing: today, this week, this month, later, and ignored.
- Message detail view with summaries, priority scores, why-it-matters explanations, suggested actions, and copyable suggested replies.
- Local contact management at `/app/contacts` with extracted contacts, notes, priority marking, and follow-up creation.
- Local follow-up tracker at `/app/followups` with upcoming, due today, overdue, and done states.
- Feedback collection and willingness-to-pay survey at `/app/feedback`.
- Founder/admin metrics dashboard at `/admin`, protected by `ADMIN_PASSWORD`.
- Anonymous analytics for MVP usage events, analysis batches, feedback, copied replies, saved contacts, and follow-up creation.
- Optional read-only Gmail integration with OAuth, encrypted token storage, manual sync, disconnect, and optional Pub/Sub webhook support.
- Optional read-only Slack integration with OAuth, encrypted token storage, manual sync, disconnect, signature verification, and event webhook handling.
- Server-side persistence for integration-imported source messages and analyzed messages.
- Vitest coverage for parsing, OAuth helpers, webhook validation, token encryption, auth redirects, schemas, fallback analysis, and follow-up logic.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui-style components
- Supabase Auth and Postgres
- OpenAI Chat Completions API
- Vitest
- ESLint
- Vercel-ready deployment

## Repository Structure

```text
.
├── public/                         Static assets
├── src/
│   ├── app/                        Next.js App Router routes
│   │   ├── admin/                  Password-protected founder metrics
│   │   ├── api/                    Route handlers for analysis, metrics, integrations, and webhooks
│   │   ├── app/                    Authenticated product screens
│   │   ├── auth/                   Supabase auth callback and sign-out routes
│   │   ├── login/                  Login UI
│   │   ├── layout.tsx              Root layout
│   │   └── page.tsx                Public landing page
│   ├── components/                 Shared navigation, landing, logging, and UI components
│   ├── data/                       Sample inbox and default goal options
│   ├── lib/                        Analysis, auth, integrations, storage, security, and utility code
│   │   ├── analysis/               OpenAI analysis path and local fallback analyzer
│   │   ├── auth/                   Profile and redirect helpers
│   │   ├── integrations/           Gmail, Slack, OAuth state, sync, and board helpers
│   │   ├── security/               Token encryption helpers
│   │   └── supabase/               Browser, server, and auth clients
│   ├── types/                      Shared TypeScript domain types
│   └── proxy.ts                    Auth-aware route protection for `/app` and `/login`
├── supabase/migrations/            Database schema for analytics, profiles, and integrations
├── package.json                    Scripts and dependencies
└── vitest.config.mts               Test configuration
```

## App Routes

- `/` - public landing page.
- `/login` - Supabase Google sign-in.
- `/app` - redirects to `/app/import` or `/app/board` based on local analysis state.
- `/app/import` - manual message paste/import flow.
- `/app/board` - prioritized reply board.
- `/app/contacts` - local relationship/contact table.
- `/app/followups` - local follow-up tracker.
- `/app/integrations` - Gmail and Slack connection management.
- `/app/account` - authenticated account screen.
- `/app/feedback` - product feedback and willingness-to-pay survey.
- `/admin` - founder metrics dashboard.

## API Routes

- `POST /api/analyze` - validates and analyzes pasted messages, rate-limited to 5 batches per anonymous user per hour when Supabase is configured.
- `GET /api/board` - returns analyzed Gmail/Slack messages for the authenticated user.
- `POST /api/events` - logs anonymous product events.
- `POST /api/feedback` - stores survey responses and optional emails.
- `GET /api/metrics` - returns admin metrics when `x-admin-password` matches `ADMIN_PASSWORD`.
- `/api/integrations/gmail/*` - Gmail connect, callback, sync-now, and disconnect routes.
- `/api/integrations/slack/*` - Slack connect, callback, sync-now, and disconnect routes.
- `/api/webhooks/gmail/pubsub` - optional Gmail Pub/Sub push endpoint.
- `/api/webhooks/slack/events` - Slack Events API endpoint with challenge and signature handling.

## Data and Storage Model

Manual pasted messages are analyzed server-side, but the raw pasted text is not stored in Supabase by default. The resulting board, extracted contacts, drafts, and follow-ups are stored in browser local storage for the beta.

Supabase is used for:

- Anonymous analytics events.
- Message batch metadata and aggregate counts.
- Feedback responses and email signups.
- Auth user profiles.
- Connected Gmail/Slack account records.
- Encrypted integration tokens.
- Integration-imported source messages.
- Integration-generated analyzed messages.
- Sync cursors and account sync state.

OAuth tokens are encrypted before storage with `TOKEN_ENCRYPTION_KEY`. Row-level security policies are enabled for user-owned profile and integration tables.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The local app runs at `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TOKEN_ENCRYPTION_KEY=
OAUTH_STATE_SECRET=
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=
GOOGLE_GMAIL_PUBSUB_TOPIC=
GMAIL_PUBSUB_WEBHOOK_TOKEN=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

OPENAI_API_KEY=
# or ANTHROPIC_API_KEY=

ADMIN_PASSWORD=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Current implementation note: `OPENAI_API_KEY` enables the OpenAI analysis path. `ANTHROPIC_API_KEY` is present in the example for future provider flexibility, but there is no Anthropic runtime path in the current code.

## Supabase Setup

Run the SQL migrations in order against the Supabase project:

```text
supabase/migrations/001_introbase_mvp.sql
supabase/migrations/002_profiles_auth.sql
supabase/migrations/003_gmail_integration.sql
```

Enable Google as an OAuth provider in Supabase Auth and add the local callback URL to the redirect allow list:

```text
http://localhost:3000/auth/callback
```

For production, add the deployed `/auth/callback` URL as well.

## Gmail Integration

Gmail sign-in is separate from Supabase sign-in. Create a Google OAuth client for Gmail read-only access and add this callback URL:

```text
http://localhost:3000/api/integrations/gmail/callback
```

The Gmail integration requests only:

```text
https://www.googleapis.com/auth/gmail.readonly
```

It can read authorized inbox messages, normalize them, store source messages, analyze pending messages, and add results to the authenticated user's board. It cannot send, delete, archive, or modify emails.

For automatic updates, configure a Google Cloud Pub/Sub topic in `GOOGLE_GMAIL_PUBSUB_TOPIC` and point the push subscription to:

```text
http://localhost:3000/api/webhooks/gmail/pubsub
```

If `GMAIL_PUBSUB_WEBHOOK_TOKEN` is set, include it as `?token=...` on the push endpoint.

## Slack Integration

Create a Slack app with OAuth v2 and add this redirect URL:

```text
http://localhost:3000/api/integrations/slack/callback
```

Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET`. The Slack integration is read-only and imports messages the installed Slack app is allowed to access. It does not request `chat:write`.

When enabling Slack Events API, set the request URL to:

```text
http://localhost:3000/api/webhooks/slack/events
```

## Scripts

```bash
npm run dev      # Start the local Next.js dev server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run ESLint
npm run test     # Run Vitest
```

## Testing

The test suite uses Vitest:

```bash
npm run test
```

Current tests cover core non-UI logic, including schema validation, local fallback analysis, normalization, follow-up status calculation, auth redirects, OAuth state signing, Gmail/Slack parsers, Gmail Pub/Sub validation, Slack signature validation, and token encryption.
