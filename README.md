# Introbase

AI command center for your messages, contacts, and follow-ups. Introbase prioritizes inbound across email, DMs, and work apps so you never miss what matters.

## What it does

Introbase lets users paste scattered inbound messages and turns them into a ranked reply queue with summaries, suggested actions, draft replies, contacts, and follow-ups.

## MVP features

- Paste emails, DMs, and connection requests
- AI message parsing and prioritization
- Priority board
- Suggested replies
- Contact extraction
- Follow-up tracking
- Anonymous usage analytics
- Feedback and willingness-to-pay survey
- Founder metrics dashboard

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- OpenAI API with local fallback analysis
- Vercel

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TOKEN_ENCRYPTION_KEY=
OAUTH_STATE_SECRET=
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=

OPENAI_API_KEY=
# or ANTHROPIC_API_KEY=

ADMIN_PASSWORD=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is only used in server route handlers. Raw pasted message text is not stored in Supabase by default; analyzed board data is stored locally in the browser.

## Google sign-in

Enable Google as an OAuth provider in Supabase Auth and add the local callback URL to the Supabase redirect allow list:

```text
http://localhost:3000/auth/callback
```

For production, also add the deployed `/auth/callback` URL. Gmail inbox access is a separate future consent step and is not requested during sign-in.

## Gmail integration

Create a separate Google OAuth client for Gmail read-only access and add this callback URL:

```text
http://localhost:3000/api/integrations/gmail/callback
```

The Gmail integration uses only `https://www.googleapis.com/auth/gmail.readonly`. `TOKEN_ENCRYPTION_KEY` encrypts OAuth tokens before storage, and `OAUTH_STATE_SECRET` signs short-lived OAuth state values.

## Database

Run the SQL files in `supabase/migrations/` against the Supabase project to create the MVP analytics and auth profile tables.

## Scripts

```bash
npm run lint
npm run build
```
