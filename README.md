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

OPENAI_API_KEY=
# or ANTHROPIC_API_KEY=

ADMIN_PASSWORD=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is only used in server route handlers. Raw pasted message text is not stored in Supabase by default; analyzed board data is stored locally in the browser.

## Database

Run `supabase/migrations/001_introbase_mvp.sql` against the Supabase project to create the MVP analytics tables.

## Scripts

```bash
npm run lint
npm run build
```
