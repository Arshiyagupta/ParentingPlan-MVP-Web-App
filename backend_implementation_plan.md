# SafeTalk – Backend Implementation Plan (MVP Phase 1)

Use this as a step-by-step checklist. Do it top to bottom and your backend will be production-ready for launch.

## Phase 0 — Project Bootstrapping

### Create environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (server-only! never client)
OPENAI_API_KEY
RESEND_API_KEY
EMAIL_FROM (e.g. SafeTalk <hello@safetsomething.com>)
APP_URL (e.g. https://yourdomain.com)
```

### Install deps (server side)

`@supabase/supabase-js`, `openai`, `zod`, `resend`, `uuid`, `dayjs` (or `date-fns`)

### Create a server Supabase client

- Utility file: `lib/supabaseServer.ts` (uses service role key for API handlers that must bypass RLS when necessary—invite send, etc.)
- Utility file: `lib/supabaseRoute.ts` (uses auth header from cookies/session for user-scoped queries)

## Phase 1 — Database Schema (Supabase SQL)

Run these as migrations in Supabase SQL editor or your migration tool.

### Profiles (mirror Supabase auth.users)

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  connection_code text not null unique, -- 6–8 char code
  created_at timestamptz not null default now()
);
```

### Pairs (one record per co-parent pair)

```sql
create type turn_role as enum ('A', 'B');
create type pair_status as enum ('active','completed');

create table pairs (
  id uuid primary key default gen_random_uuid(),
  status pair_status not null default 'active',
  current_round smallint not null default 1, -- 1..5
  current_turn turn_role not null default 'A',
  created_at timestamptz not null default now()
);
```

### Pair members (who is A, who is B)

```sql
create table pair_members (
  pair_id uuid not null references pairs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role turn_role not null, -- 'A' or 'B'
  joined_at timestamptz not null default now(),
  primary key (pair_id, user_id),
  unique (pair_id, role)
);
```

### Invites

```sql
create type invite_status as enum ('sent','accepted','expired');

create table invites (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid references pairs(id) on delete cascade,
  inviter_user_id uuid not null references profiles(id) on delete cascade,
  invitee_email text not null,
  token uuid not null default gen_random_uuid(), -- used in email link
  status invite_status not null default 'sent',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index on invites (token);
create index on invites (invitee_email);
```

### Qualities (each round entry)

```sql
create table qualities (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references pairs(id) on delete cascade,
  author_role turn_role not null,  -- 'A' or 'B'
  round_number smallint not null check (round_number between 1 and 5),
  draft_text text,
  ai_suggested_text text,
  approved_text text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pair_id, author_role, round_number)
);

create index on qualities (pair_id, round_number);
```

### Events (optional analytics)

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid references pairs(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text not null, -- 'signup_completed','invite_sent', etc.
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

### Connection code generator

On profile insert: generate unique 6–8 char uppercase code (do this app-side on first login or via DB function).

Simpler: generate in app and write to `profiles.connection_code`.

## Phase 2 — Row Level Security (RLS) & Policies

Enable RLS on all user data tables and add tight policies.

### Enable RLS

```sql
alter table profiles enable row level security;
alter table pairs enable row level security;
alter table pair_members enable row level security;
alter table qualities enable row level security;
alter table invites enable row level security;
alter table events enable row level security;
```

### Profiles policies

```sql
create policy "profiles_self_read" on profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id);
```

### Pairs & pair_members policies (membership-based)

```sql
create policy "pairs_member_select" on pairs
  for select using (
    exists (select 1 from pair_members pm where pm.pair_id = id and pm.user_id = auth.uid())
  );

create policy "pair_members_self_select" on pair_members
  for select using (user_id = auth.uid() or
    exists (select 1 from pair_members pm where pm.pair_id = pair_members.pair_id and pm.user_id = auth.uid())
  );
```

Inserts/updates to these tables will be done via server routes using the service role key to keep logic consistent and secure.

### Qualities policies

```sql
create policy "qualities_member_select" on qualities
  for select using (
    exists (select 1 from pair_members pm where pm.pair_id = qualities.pair_id and pm.user_id = auth.uid())
  );
```

Inserts for qualities also go through server routes (enforcing turn/round rules). No direct client writes.

### Invites & Events policies

Reads allowed to inviter or pair members (if you want); writes via server only.

## Phase 3 — Server Utilities

### Auth helpers

`getUser()` to read Supabase session and fetch profiles row (ensure connection_code exists; if missing, generate and update).

### Pair membership helpers

`getOrCreateActivePairForUser(userId)` – creates an unpaired pairs row and pair_members(A) record if none exists; used when A green-lights Round 1.

`getMemberRole(pairId, userId)` returns 'A' | 'B'.

### Turn engine helpers

`validateTurn(pair, userRole, roundNumber)` – throws if it's not user's turn or wrong round.

`advanceTurn(pairId)` – after a quality is approved:
- If only one side for current round is completed → set current_turn to the other role.
- If both for current round are completed → current_round++, set current_turn='A'.
- If current_round becomes 6 → mark pairs.status='completed'.

## Phase 4 — Email Templates (Resend)

### Invite email

Inputs: `{inviteeEmail, inviterNameOrEmail, pairId, token, connectionCode, approvedTextPreview}`

CTA link: `${APP_URL}/signup?invite=${token}`

Include the connection code in the body as a fallback.

### Turn notification email

Inputs: `{recipientEmail, roundNumber}`

CTA link: `${APP_URL}/dashboard`

### Resend setup

Create `lib/email.ts` with `sendInviteEmail()` and `sendTurnEmail()`.

Ensure DKIM is configured on your domain (can be done later; Resend still works without but may go to spam).

## Phase 5 — AI Coaching Endpoint

### POST /api/coach

Request: `{ draft: string }`

1. Validate with zod (length, no HTML).
2. Call OpenAI with a short, deterministic prompt:
   "Rewrite this appreciation for a co-parent so it feels warm, specific, and non-triggering. Keep it to 1–2 sentences. Avoid blame or conditions."
3. Response: `{ suggestion: string }`

(No DB write here; this is just the suggestion step.)

## Phase 6 — Scorecard Read API

### GET /api/scorecard

Auth required.

Returns:
```json
{
  "pair": { "id": "...", "status": "active", "current_round": 1, "current_turn": "A" },
  "you": { "role": "A" },
  "slots": [
    { "round": 1, "A": { "state": "completed|active|locked", "text": "..." }, "B": {...} },
    // ... up to 5
  ],
  "progress": 0,  // 0..10 approved
  "invite": { "sentTo": "email@example.com", "status": "sent" } // if exists
}
```

Build slots by joining pairs, pair_members, qualities.

## Phase 7 — Approve (Green-Light) API

### POST /api/qualities/approve

Request: `{ roundNumber: 1..5, approvedText: string }`

Steps (single DB transaction):
1. Resolve user → profile → ensure pair and role.
2. `validateTurn(pair, role, roundNumber)`.
3. Upsert into qualities:
   - If row exists (same pair_id, author_role, round_number) → update its approved_text, approved_at=now(); else insert new.
4. Update pairs via `advanceTurn(pairId)`.
5. If this was Parent A's Round 1 approval and there's no accepted invite yet:
   - Mark a flag in response `needsInvite: true`.
6. Respond with updated scorecard summary (round, text, progress).

Constraints enforced by transaction, not client.

## Phase 8 — Invite Flow APIs

### POST /api/invites (send invite)

Request: `{ email: string }`

Steps (transaction):
1. Resolve user → ensure they are in a pair as A (or any role; you decide—but MVP spec assumes A invites after Round 1).
2. Create invites row with pair_id, invitee_email.
3. Send email with token + include approved A Round 1 text (preview).
4. Return `{ ok: true }`.

### POST /api/invites/resend (optional)

Rate limit server-side (e.g., one per hour).

### POST /api/connect/accept

Request: `{ token: string, passwordless?: boolean }` (You'll already have the token via `/signup?invite=...` on the frontend)

Steps (transaction):
1. Find invite by token, ensure status='sent'.
2. Get pair_id. If no pair_members record for this user on that pair:
   - Insert pair_members with role='B' (since A existed first).
3. Mark invite status='accepted', accepted_at=now().
4. Return pair summary and redirect target (`/dashboard`).

## Phase 9 — Turn Notifications

### After qualities/approve completes

1. Determine who's next (based on pairs.current_turn after `advanceTurn`).
2. Fetch that user's email and send turn notification.
3. Only send if pair is not completed.

## Phase 10 — Completion

### GET /api/completion

Returns the 10 approved statements for the pair once `pairs.status='completed'`.

(Optional) Mark an `events.flow_completed` row.

## Phase 11 — Security & Validation

### Zod validation on every input (API handlers).

### Rate limiting (simple)

- Per IP/email for invites (e.g., 3/hour).
- Per user for coach calls (e.g., 20/hour).

### Guardrails

- In `/api/coach` consider a light content filter (reject profanity, slurs).
- In `/api/qualities/approve`, re-validate text length + basic sanitation (strip HTML).

### RLS sanity tests

Confirm that non-members cannot read or write a pair's data when using anon key.

## Phase 12 — Wiring the Frontend to Backend

### Scorecard page

- On mount: `GET /api/scorecard`
- Button "Open to draft" → route to `/slot/[round]`

### Chat page

- "Ask to refine" → `POST /api/coach`
- "Green-Light" → `POST /api/qualities/approve`
- If response `{ needsInvite: true }` → open Invite Modal

### Invite Modal

- Submit → `POST /api/invites`
- Success toast + dashboard banner "Waiting for your co-parent"

### Invite Landing

- From email, frontend reads `?invite=TOKEN`
- After B signs up, call `POST /api/connect/accept` → go to `/dashboard`

### Notifications

No client action; purely server-side after approvals.

## Phase 13 — Admin/Dev Utilities (MVP-light)

### Seed script (optional)

Create two test users, one pair, a few qualities for local dev.

### Console queries

Saved SQL in Supabase for checking state (pairs, members, qualities by pair).

## Phase 14 — Testing Checklist (Ship-blockers only)

### Auth

Sign up creates profile + connection_code.

### Turn engine

- A can approve Round 1 before B exists.
- After A Round 1 → invite required to progress (A sees locked Slot 2).
- B accepts invite → B Round 1 becomes active; after B completes → A Round 2 unlocks.
- Alternation continues until Round 5 both sides are done → pair status completed.

### Emails

- Invite email renders A's approved text + connection code + link with token.
- Turn email points to dashboard.

### Permissions

- Non-member cannot fetch someone else's scorecard via `/api/scorecard`.
- Users cannot write qualities for the other role or wrong round.

### Idempotency

- Re-sending invites doesn't create duplicate pair_members.
- Approving a round twice doesn't create duplicates (thanks to unique constraint).

### Failure paths

- Wrong token → clean error.
- Invite to already-registered email → still works (they'll just accept & connect).

## Phase 15 — Deployment

### Secrets in Vercel env

Add all envs; mark SUPABASE_SERVICE_ROLE_KEY as server-only.

### Supabase policies enabled (double-check).

### Domain + email

Resend domain verified (DKIM) to avoid spam (or use a Resend shared domain temporarily).

### Smoke test on production

Do a full A→B flow end-to-end with two real inboxes.

### (Nice-to-have, still tiny)

- `/api/health` → `{ ok: true }`
- Events logging for core milestones (`invite_sent`, `invite_accepted`, `slot_greenlit`, `flow_completed`)
- Admin: pair lookup (protected by a secret header) to help you support early users