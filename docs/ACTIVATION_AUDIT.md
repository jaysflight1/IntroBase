# IntroBase Activation Audit

## 1. Likely User

IntroBase appears built for founders, solo builders, and small-team operators who receive important inbound across email, Slack, LinkedIn, DMs, Discord, texts, and other message channels. The likely first user is time-constrained, relationship-sensitive, and worried about missing high-value replies such as investor follow-ups, customer opportunities, recruiting messages, and partnership requests.

## 2. Main Aha Moment

The main aha moment is seeing a messy inbox become a prioritized reply board. A new user should quickly understand: "IntroBase tells me who needs a reply first, why it matters, and what I can say next."

The strongest activation moment currently happens after sample or pasted messages are analyzed and the user lands on the board grouped by timing: Today, This week, This month, Later, and Ignore.

## 3. Current Onboarding Path

1. Public landing page at `/` explains the product, shows a preview board, and offers `Sign in` plus `Try demo`.
2. `Try demo` opens `/demo/import`, which loads sample messages into the same import experience used by the app.
3. The demo simulates analysis, then sends the user to `/demo/board`, where a tutorial introduces the ranked board interactions.
4. `Sign in` opens `/login`, where Google sign-in is handled through Supabase Auth.
5. First-time signed-in users are routed to `/app/onboarding`, where they can either start the demo tutorial or open a blank workspace.
6. The blank workspace opens `/app/import`, where users paste one message per card, add optional sender/source/notes, choose prioritization goals, and run analysis.
7. After analysis, users land on `/app/board`, where messages are grouped by urgency and support suggested replies, deadline edits, contacts, and follow-ups.
8. Returning signed-in users open `/app`; if browser storage has a current analysis, they are redirected to `/app/board`, otherwise to `/app/import`.

## 4. Friction Points Ranked by Severity

1. High: The first real-use path depends on pasting messages manually, but the landing page can imply multiple live inbox integrations. Slack is available in the product UI, while Gmail is explicitly coming soon.
2. High: The app's first persistent value depends on browser local storage for manual analysis state. A new user may expect a signed-in board to automatically exist across devices after manual import.
3. Medium: The blank workspace starts with an empty import card and several optional controls, which may slow users who just want to see the first board as quickly as possible.
4. Medium: The public demo is strong, but the transition from demo success to using real messages depends on noticing the sign-in or return path rather than a single persistent conversion prompt.
5. Low: The README is clear for developers, but there was no dedicated activation audit or onboarding map before this document.

## 5. Recommended Fixes Ranked by Effort

1. Low: Align landing-page integration copy with current reality: manual paste works now, Slack is available, and Gmail is coming soon.
2. Low: Add a small hint on the import page that the fastest path is to paste one real message or load the sample inbox.
3. Low: After the demo board tutorial, make the primary next action clearly point to importing real messages or signing in to save.
4. Medium: Add a first-run checklist or compact onboarding banner inside `/app/import` that names the three steps: paste, analyze, review board.
5. Medium: Clarify which data is browser-local versus account-backed in the account or import experience, especially for manual pasted boards.
6. High: Add account-backed persistence for manually pasted analyses if durable cross-device boards become a core expectation.

## 6. One Tiny Change That Would Most Improve Clarity

Update the landing-page step copy that currently says "Gmail and Slack integrations are optional." The clearest tiny change is to say that users can paste messages now, connect Slack when ready, and treat Gmail as coming soon. This reduces expectation mismatch before sign-in without changing product behavior.
