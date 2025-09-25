# SafeTalk MVP Plan – Phase 1

## Product Overview – 1-liner vision

A simple, turn-based web app that helps high-conflict co-parents rebuild trust by alternating rounds of sharing good qualities about each other, supported by AI coaching, one step at a time.

## Finalized MVP Features – Must-haves for Phase 1

### Account & Authentication

Email + password sign-up/login.

Each user gets a unique connection code.

### Connection & Invitations

First parent can start without waiting.

After Parent A submits their first good quality, they enter Parent B's email → system sends an invite email with A's good quality + connection code.

Parent B signs up from invite link, connects accounts automatically.

### Scorecard Framework (Locked/Turn-Based)

5 rows for "good qualities."

Only one row/button active per user at a time.

Remaining slots stay locked until the other parent responds.

### Good Qualities Input Flow

Parent clicks the active row → opens AI brainstorm chat.

User drafts → AI suggests non-triggering language → user approves (Green Light).

Approved text is locked into the scorecard.

### Turn Alternation Logic

Parent A starts → completes Slot 1.

Parent B invited → completes Slot 1.

Alternating continues until 5 rounds are complete (10 total qualities).

### Email Notifications

Invite email after Parent A's first quality.

Turn notification emails whenever it's the other parent's turn.

### Completion Screen

Simple summary view showing 10 approved good qualities.

(Optional placeholder row for "Conflict" text, locked until after rounds are done.)

## Detailed User Journey – End to End

### Parent A (Initiator)

Lands → signs up with email + password.

Sees scorecard (5 rows). Only Slot 1 is active.

Clicks Slot 1 → AI brainstorm chat → approves → Slot 1 locks.

Prompt appears: "Enter your co-parent's email to invite them."

Invitation email is sent to Parent B. Parent A now sees "Waiting for Parent B to respond."

### Parent B (Invitee)

Opens email → clicks join link.

Signs up with email + password (connection code pre-filled).

Lands on scorecard: sees Parent A's Slot 1 (read-only). Slot 1 is active for them.

Clicks Slot 1 → AI brainstorm chat → approves → Slot 1 locks.

### Alternating Rounds

Parent A gets email: "Your turn to add Good Quality #2."

Parent A sees Slot 2 unlocked → completes via AI chat → locks Slot 2.

Parent B gets email: "Your turn to add Good Quality #2."

Flow continues, alternating turns, until all 5 slots each are filled.

### Completion

When both complete Slot 5, scorecard shows:

"10 Good Qualities Completed."

Display of all entries in one view.

Soft message: "Would you like to name one conflict to work on later?" (optional MVP).

## Tech Stack (Practical & Simple for MVP)

**Frontend:** Next.js + Tailwind CSS (simple, fast, responsive).

**Backend:** Supabase (Auth, Postgres DB, API).

**Authentication:** Supabase Auth (email + password).

**Database:** Postgres via Supabase (users, pairs, qualities, invites).

**Email:** Resend (or Supabase email integration for invites/notifications).

**AI Processing:** OpenAI API (for rewording/reframing in the brainstorm chat).

**Hosting:** Vercel (deploy frontend + backend edge functions).

✅ **This plan gives you a tight, testable MVP:**

One clear activity (5 alternating rounds of good qualities).

Minimal features (no payments, no extras).

Designed to answer the key question: "Will high-conflict co-parents actually engage in this structured goodwill exchange?"