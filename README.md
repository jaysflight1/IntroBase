# IntroBase

IntroBase is a command center for inbound messages. It helps founders and busy builders turn scattered emails, DMs, Slack messages, Discord messages, texts, and connection requests into a prioritized reply board with deadlines, suggested actions, editable suggested replies, contacts, and follow-ups.

The current product supports:

- Streamlined Google sign-in through Supabase Auth.
- Paste-in message importing as the primary workflow.
- A guided public demo with sample messages and fake one-second-per-message analysis.
- Slack as the available inbox integration.
- Gmail shown as coming soon, but not available in the product UI.
- Production message analysis uses the local parser by default. Local development can optionally test OpenAI `gpt-4.1-mini` when `OPENAI_API_KEY` is configured.

## Product Flow

1. Visitors land on `/`, where they can try the demo or sign in.
2. New account creators are sent to `/app/onboarding`, where they can choose the guided demo tutorial or jump straight into a blank workspace.
3. Returning signed-in users open `/app`; if they already have an analyzed board in this browser, they are sent to `/app/board`, otherwise they start at `/app/import`.
4. Users paste messages into modular message cards on `/app/import`. Each card supports a message body plus optional sender, source, and notes.
5. IntroBase analyzes each message, marks progress message-by-message, and then opens the board.
6. The board groups messages by urgency: Today, This week, This month, Later, and Ignore.
7. Users can drag messages between columns, reorder cards within columns, edit deadline pills, edit suggested replies, save contacts, create follow-ups, and delete messages.

## Features

- Public landing page with sample priority board, demo CTA, Google sign-in CTA, footer privacy link, and anonymous visit logging.
- Public `/privacy` page with current product disclosures for pasted messages, account storage, local parser analysis, Slack, future Gmail support, analytics, and deletion.
- Supabase Auth with Google sign-in, protected `/app` routes, profile creation, sign-out, and first-run onboarding.
- Guided demo routes at `/demo/import` and `/demo/board` using the same example messages as the main sample inbox, but with read-only demo messages and simulated analysis.
- Manual import at `/app/import` with one card per message, optional sender/source/notes fields, drag-to-delete import cards, previous analyzed messages, progress tracking, and local draft persistence.
- Production analysis through the local heuristic parser.
- Optional local-development OpenAI analysis through `gpt-4.1-mini` when configured, with automatic parser fallback.
- Analysis diagnostics that track parser vs optional local OpenAI usage.
- Analysis rate limiting at `100` analyzed batches per anonymous user per hour when Supabase is configured, with a hard-coded admin exemption in `src/lib/analysis/rateLimit.ts`.
- Prioritized board at `/app/board` grouped by reply timing with editable cards, drag-and-drop movement, manual ordering, editable deadlines, editable suggested replies, and a delete target.
- Collapsible board sidebar so message columns can use more horizontal space.
- Contacts page at `/app/contacts` with extracted contacts, notes, star/unstar behavior, saved contacts, priority timing, and follow-up creation.
- Follow-up tracker at `/app/followups` with upcoming, due today, overdue, and done states.
- Integrations page at `/app/integrations` where Slack is available and Gmail is greyed out as coming soon.
- Account page at `/app/account` with account identity, integration access note, and delete-data action.
- Feedback collection at `/app/feedback`.
- Password-protected admin metrics dashboard at `/admin` using `ADMIN_PASSWORD`.
- Anonymous metrics for essential activity such as visits, message creation, analysis attempts, analysis results, repeat usage, feedback, saved contacts, and follow-ups.
- Vercel Analytics through `@vercel/analytics/next`.
- Slack OAuth, encrypted token storage, manual sync, disconnect, signature verification, Events API support, and queued sync processing.
- Server-side persistence for integration-imported source messages, analyzed messages, saved contacts, and follow-ups.
- Vitest coverage for parsing, schemas, fallback analysis, reply timing, auth redirects, OAuth helpers, Slack/Gmail helper code, sync jobs, token encryption, and follow-up logic.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Base UI / shadcn-style components
- Supabase Auth and Postgres
- Optional local-development OpenAI Chat Completions API path
- Slack OAuth and Events API
- Vercel Analytics
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
│   │   ├── api/                    Route handlers for analysis, metrics, Slack, storage, and webhooks
│   │   ├── app/                    Authenticated product screens
│   │   ├── auth/                   Supabase auth callback and sign-out routes
│   │   ├── demo/                   Public demo import and board flow
│   │   ├── login/                  Google sign-in UI
│   │   ├── privacy/                Public privacy policy
│   │   ├── layout.tsx              Root layout and Vercel Analytics
│   │   └── page.tsx                Public landing page
│   ├── components/                 Shared navigation, landing, logging, and UI components
│   ├── data/                       Sample inbox, demo analysis, and default goal options
│   ├── lib/                        Analysis, auth, integrations, storage, security, and utility code
│   │   ├── analysis/               Local parser, optional local OpenAI path, diagnostics, and rate limiting
│   │   ├── auth/                   Profile and redirect helpers
│   │   ├── integrations/           Slack, Gmail/future support helpers, OAuth state, sync, and board helpers
│   │   ├── security/               Token encryption helpers
│   │   └── supabase/               Browser, server, and auth clients
│   ├── types/                      Shared TypeScript domain types
│   └── proxy.ts                    Auth-aware route protection for `/app` and `/login`
├── supabase/migrations/            Database schema for analytics, auth profiles, integrations, relationships, and grants
├── package.json                    Scripts and dependencies
└── vitest.config.mts               Test configuration
```

## App Routes

- `/` - public landing page.
- `/privacy` - public privacy policy.
- `/login` - Google sign-in through Supabase Auth.
- `/demo` - redirects to `/demo/import`.
- `/demo/import` - guided sample import with pre-filled, read-only example messages and fake analysis progress.
- `/demo/board` - guided sample board tutorial.
- `/app` - signed-in app entry point; sends returning users with existing local analysis to the board and others to import.
- `/app/onboarding` - first-run choice between demo tutorial and blank workspace.
- `/app/import` - paste-in message workflow.
- `/app/board` - prioritized reply board.
- `/app/contacts` - saved relationship/contact table.
- `/app/followups` - follow-up tracker.
- `/app/integrations` - Slack connection management; Gmail shown as coming soon.
- `/app/account` - authenticated account and data deletion screen.
- `/app/feedback` - product feedback and willingness-to-pay survey.
- `/admin` - founder metrics dashboard protected by `ADMIN_PASSWORD`.

## API Routes

- `POST /api/analyze` - validates and analyzes pasted messages, using the local parser in production and optional OpenAI only outside production.
- `GET /api/board` - returns server-stored analyzed Slack/Gmail/future integration messages for the authenticated user.
- `/api/contacts` - loads and saves authenticated user contacts.
- `/api/followups` - loads and saves authenticated user follow-ups.
- `POST /api/account/delete-data` - deletes authenticated IntroBase data and integration tokens.
- `POST /api/events` - logs anonymous product events.
- `POST /api/feedback` - stores survey responses and optional emails.
- `GET /api/metrics` - returns admin metrics when `x-admin-password` matches `ADMIN_PASSWORD`.
- `/api/integrations/slack/*` - Slack connect, callback, sync-now, and disconnect routes.
- `/api/webhooks/slack/events` - Slack Events API endpoint with challenge and signature handling.
- `/api/cron/process-sync-jobs` - protected cron endpoint for queued integration sync jobs.
- `/api/cron/fallback-poll` - protected cron endpoint for fallback polling.
- `/api/integrations/gmail/*`, `/api/webhooks/gmail/pubsub`, and `/api/cron/gmail-watch-renewal` - code exists for Gmail/future support, but Gmail is not currently available in the product UI.

## Data and Storage Model

IntroBase uses both browser local storage and Supabase-backed server storage.

Browser local storage is used for:

- Anonymous user and session identifiers.
- Import drafts and previous import cards.
- Current manual-analysis board state.
- Demo board state.
- Board ordering and deleted-message state.
- Saved contacts and follow-ups for fast local UX.
- Local analysis diagnostics.

Supabase is used for:

- Anonymous analytics events.
- Message batch metadata and aggregate counts.
- Feedback responses and optional emails.
- Auth user profiles.
- Connected Slack account records.
- Encrypted integration tokens.
- Integration-imported source messages.
- Integration-generated analyzed messages.
- Sync cursors and account sync state.
- Durable sync jobs for webhook-triggered and fallback processing.
- Saved contacts and follow-ups for authenticated users.
- Admin metrics.

Manual pasted messages are sent to the server for analysis by IntroBase's parser. Production does not send pasted messages to OpenAI. The current app also stores the analyzed board in the user's browser and may store account-backed board/contact/follow-up data so users can view their board. See `/privacy` for the user-facing privacy disclosure.

OAuth tokens are encrypted before storage with `TOKEN_ENCRYPTION_KEY`. Row-level security policies are enabled for user-owned profile, integration, contact, and follow-up tables, and service-role grants are applied through migrations for server-side jobs.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The local app runs at:

```text
http://localhost:3000
```

## Environment Variables

Required for Google sign-in and account-backed storage:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional for local-development OpenAI analysis only:

```bash
OPENAI_API_KEY=
```

Required for Slack integration:

```bash
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
TOKEN_ENCRYPTION_KEY=
OAUTH_STATE_SECRET=
```

Required for admin and cron features:

```bash
ADMIN_PASSWORD=
CRON_SECRET=
```

Present for future or currently unavailable Gmail support:

```bash
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=
GOOGLE_GMAIL_PUBSUB_TOPIC=
GMAIL_PUBSUB_WEBHOOK_TOKEN=
```

Implementation note: `OPENAI_API_KEY` is the only optional LLM provider path, and production disables it in code even if the variable is present. `ANTHROPIC_API_KEY` may appear in older notes, but there is no active Anthropic runtime path in the current code.

## Supabase Setup

Run the SQL migrations in order against the Supabase project:

```text
supabase/migrations/001_introbase_mvp.sql
supabase/migrations/002_profiles_auth.sql
supabase/migrations/003_gmail_integration.sql
supabase/migrations/004_sync_jobs.sql
supabase/migrations/005_saved_relationships.sql
supabase/migrations/006_service_role_grants.sql
supabase/migrations/007_contact_starred.sql
```

The `003_gmail_integration.sql` migration also defines shared integration storage used by the current Slack path. Gmail-facing UI remains disabled/coming soon.

Enable Google as an OAuth provider in Supabase Auth for sign-in. Add local and production auth callback URLs to the Supabase redirect allow list:

```text
http://localhost:3000/auth/callback
https://YOUR_PRODUCTION_DOMAIN/auth/callback
```

In Google Cloud, the OAuth client used by Supabase sign-in should also allow the Supabase Auth callback URL for your project. The app itself uses `/auth/callback` after Supabase redirects back to the site.

## Optional Local OpenAI Setup

Set `OPENAI_API_KEY` in `.env.local` only if you want to test the OpenAI path during local development. Do not set it in production. The current prompt targets `gpt-4.1-mini` through the OpenAI Chat Completions API.

In production, IntroBase skips OpenAI before any request can be made and records `production_openai_disabled` diagnostics. Outside production, if the key is missing, OpenAI requests fail, or the response does not validate against the expected schema, IntroBase falls back to the local parser and records diagnostics in the returned analysis and local diagnostics counters.

## Slack Integration

Create a Slack app with OAuth v2 and add this redirect URL:

```text
http://localhost:3000/api/integrations/slack/callback
```

For production, add:

```text
https://YOUR_PRODUCTION_DOMAIN/api/integrations/slack/callback
```

Set:

```bash
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
TOKEN_ENCRYPTION_KEY=
OAUTH_STATE_SECRET=
NEXT_PUBLIC_APP_URL=
```

The Slack integration is read-only from the product perspective and imports messages the installed Slack app is allowed to access. It does not request `chat:write`.

When enabling Slack Events API, set the request URL to:

```text
http://localhost:3000/api/webhooks/slack/events
```

For production:

```text
https://YOUR_PRODUCTION_DOMAIN/api/webhooks/slack/events
```

Slack sync can be run manually from `/app/integrations`. Webhook and queued sync processing use `/api/cron/process-sync-jobs` and `/api/cron/fallback-poll`, protected by `CRON_SECRET`.

## Gmail Status

Gmail is not currently available in the app UI. `/app/integrations` shows Gmail as coming soon and directs users to Slack or manual paste-in import.

Some Gmail helper code, route handlers, tests, schema, and cron configuration still exist in the repository for future support. Do not present Gmail as a live integration until the product UI and deployment configuration are intentionally re-enabled.

## Privacy and Compliance Notes

- The public Privacy Policy lives at `/privacy` and is linked from the homepage footer.
- The Import page includes a short privacy notice explaining that production uses IntroBase's parser and that account-backed data may be stored so users can view their board.
- IntroBase does not sell user data or use message content for advertising.
- Slack tokens are encrypted before storage.
- The Account page includes a delete-data action for authenticated users.
- Google sign-in is streamlined for authentication only; Gmail access is separate and currently unavailable in the UI.

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

Current tests cover core non-UI logic, including schema validation, local fallback analysis, the production OpenAI kill switch, OpenAI response repair for local development, reply timing, message parsing, follow-up status calculation, auth redirects, OAuth state signing, Slack parser/signature logic, Gmail helper logic retained for future support, integration sync jobs, token encryption, and profile mapping.

For documentation-only changes, `npm run lint` is usually enough as a lightweight sanity check. For code changes touching analysis, integrations, auth, or persistence, run both:

```bash
npm run lint
npm run test
```

Run a production build before deployment:

```bash
npm run build
```
