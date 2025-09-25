# SafeTalk – Backend Implementation Checklist (MVP Phase 1)

## A) Database & Authentication (start here)

* [ ] Create Supabase project (enable Auth + Postgres).
* [ ] Enable **Email/Password** in Supabase Auth.
* [ ] Add **environment variables** to Vercel/your server:

  * [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  * [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed)
  * [ ] `RESEND_API_KEY`, `EMAIL_FROM` (e.g., `SafeTalk <hello@yourdomain.com>`)
  * [ ] `OPENAI_API_KEY`
  * [ ] `APP_URL` (e.g., `https://yourdomain.com`)
* [ ] Install backend deps: `@supabase/supabase-js`, `zod`, `uuid`, `resend`, `openai`, `date-fns` (or `dayjs`).
* [ ] Create **SQL migration** for enums:

  * [ ] `turn_role` = ('A','B')
  * [ ] `pair_status` = ('active','completed')
  * [ ] `invite_status` = ('sent','accepted','expired')
* [ ] Create **tables** per design:

  * [ ] `profiles (id PK->auth.users, email unique, connection_code unique, created_at)`
  * [ ] `pairs (id, status, current_round, current_turn, created_at)`
  * [ ] `pair_members (pair_id, user_id, role, joined_at)` with PK `(pair_id,user_id)` and UNIQUE `(pair_id,role)`
  * [ ] `qualities (id, pair_id, author_role, round_number, draft_text, ai_suggested_text, approved_text, approved_at, created_at)` with UNIQUE `(pair_id,author_role,round_number)`
  * [ ] `invites (id, pair_id, inviter_user_id, invitee_email, token, status, created_at, accepted_at)` with INDEX on `(token)` and `(invitee_email)`
  * [ ] `events (optional: id, pair_id, user_id, type, metadata, created_at)`
* [ ] Enable **RLS** on all tables (`profiles`, `pairs`, `pair_members`, `qualities`, `invites`, `events`).
* [ ] Add **RLS policies**:

  * [ ] `profiles`: user can select/update only where `auth.uid() = id`.
  * [ ] `pairs`: select allowed only if user is a member of the pair.
  * [ ] `pair_members`: select allowed to the member or any member of same pair.
  * [ ] `qualities`: select allowed to members of the pair.
  * [ ] `invites/events`: reads limited (optional); **all writes via server** (service role).
* [ ] Implement **connection code** generation on first profile creation (6–8 uppercase, unique).

## B) Server Setup & Utilities

* [ ] Create server Supabase client utilities:

  * [ ] `lib/supabaseServer.ts` (service-role client for API routes that must bypass RLS logic safely)
  * [ ] `lib/supabaseRoute.ts` (auth-scoped client reading session from cookies)
* [ ] Implement auth helper:

  * [ ] `getUser()` → returns `{ userId, email, profile }` and ensures `profiles` row + `connection_code` exists.
* [ ] Pair helpers:

  * [ ] `getOrCreateActivePairForUser(userId)` (create pair + member A when needed)
  * [ ] `getMemberRole(pairId, userId)` → 'A' | 'B'
* [ ] Turn engine helpers:

  * [ ] `validateTurn(pair, role, roundNumber)` → throws on wrong round/turn
  * [ ] `advanceTurn(pairId)` transactional logic:
    \- If only one side completed for current round → switch `current_turn`
    \- If both completed → `current_round++`, set `current_turn='A'`
    \- If `current_round > 5` after completion → set `status='completed'`

## C) Email Infrastructure (Resend)

* [ ] Configure domain/DKIM for Resend (or use shared domain initially).
* [ ] Build email templates:

  * [ ] **Invite Email** (inputs: inviteeEmail, inviterEmail, pairId, token, connectionCode, approvedTextPreview; CTA to `${APP_URL}/signup?invite=${token}`)
  * [ ] **Turn Notification Email** (inputs: recipientEmail, roundNumber; CTA `${APP_URL}/dashboard`)
* [ ] `lib/email.ts` with `sendInviteEmail()` and `sendTurnEmail()`.

## D) AI Coaching Endpoint

* [ ] Route: `POST /api/coach`

  * [ ] Validate body with `zod`: `{ draft: string }` (length limit, strip HTML)
  * [ ] Prompt OpenAI for a warm, specific, non-triggering 1–2 sentence rewrite
  * [ ] Return `{ suggestion }`
  * [ ] Add simple rate limit (e.g., 20/hour per user)

## E) Core API – Scorecard Read

* [ ] Route: `GET /api/scorecard`

  * [ ] Auth required → `getUser()`
  * [ ] Resolve user's pair & role (create pair if A needs one and none exists)
  * [ ] Read `pairs`, `pair_members`, `qualities`, most recent `invite`
  * [ ] Build and return:

    ```json
    {
      "pair": { "id": "...", "status": "active", "current_round": 1, "current_turn": "A" },
      "you": { "role": "A" },
      "slots": [
        { "round": 1, "A": { "state": "completed|active|locked", "text": "..." }, "B": { ... } }
      ],
      "progress": 0,
      "invite": { "sentTo": "email@x.com", "status": "sent" }
    }
    ```
  * [ ] State calculation matches UI: one active slot/button per user.

## F) Core API – Approve (Green-Light)

* [ ] Route: `POST /api/qualities/approve`

  * [ ] Validate body with `zod`: `{ roundNumber: number(1..5), approvedText: string }`
  * [ ] Transaction:

    * [ ] Resolve user, pair, role
    * [ ] `validateTurn(pair, role, roundNumber)`
    * [ ] Upsert `qualities` row (by `(pair_id, author_role, round_number)`), set `approved_text`, `approved_at`
    * [ ] Call `advanceTurn(pairId)` to update `pairs`
  * [ ] Detect special case: if **A approves Round 1** and no accepted invite exists → return `{ needsInvite: true }`
  * [ ] After commit, **send turn-notification** to the **new current turn** user (unless pair completed)
  * [ ] Respond with updated progress & slot summary

## G) Core API – Invite Flow

* [ ] Route: `POST /api/invites` (send invite)

  * [ ] Validate body `{ email: string }`
  * [ ] Ensure caller is a member of a pair, typically role A
  * [ ] Insert `invites` row with token; fetch A's approved Round 1 text
  * [ ] `sendInviteEmail()` with token + connection code
  * [ ] Return `{ ok: true }` (and store `events.invite_sent`)
* [ ] Route: `POST /api/invites/resend` (optional)

  * [ ] Rate-limit per invite (e.g., once per hour)
* [ ] Route: `POST /api/connect/accept`

  * [ ] Validate body `{ token: string }`
  * [ ] Find invite; ensure `status='sent'`
  * [ ] Add `pair_members` for current user with `role='B'` (if not present)
  * [ ] Mark invite `status='accepted'`, `accepted_at=now()`
  * [ ] Return pair summary (redirect handled client-side)

## H) Completion Read

* [ ] Route: `GET /api/completion`

  * [ ] Auth required; ensure pair `status='completed'`
  * [ ] Return all 10 `approved_text` entries + authors/rounds for summary screen

## I) Validation, Guardrails, and RLS Sanity

* [ ] Apply **Zod** to every API route body/query.
* [ ] Sanitize text inputs (strip HTML; length caps).
* [ ] Minimal toxicity guard (block slurs/profanity) in approve flow; nudge to rephrase.
* [ ] Verify **RLS**: non-members cannot read/write pair data using anon key.
* [ ] Ensure all **writes** go through server routes (service role client only where necessary).

## J) Frontend Wiring (calls only; UI already built)

* [ ] `/dashboard` calls `GET /api/scorecard` on mount.
* [ ] Slot "Open to draft" flow:

  * [ ] Chat "Refine" → `POST /api/coach`
  * [ ] Chat "Green-Light" → `POST /api/qualities/approve`
  * [ ] If `{ needsInvite: true }` → open Invite Modal
* [ ] Invite Modal submit → `POST /api/invites`
* [ ] Invite email link → frontend extracts `?invite=TOKEN`:

  * [ ] After sign-up, call `POST /api/connect/accept` then redirect to `/dashboard`.

## K) Events (optional, tiny)

* [ ] On key milestones, insert rows into `events`:

  * [ ] `signup_completed`, `slot_greenlit`, `invite_sent`, `invite_accepted`, `turn_unlocked`, `flow_completed`
* [ ] Keep `metadata` small (e.g., `{ "round": 2, "role": "A" }`).

## L) Testing (ship blockers)

* [ ] Create two real test accounts (A & B) in Production project.
* [ ] A can sign up → `/dashboard` shows Slot 1 active.
* [ ] A can draft → coach → green-light Round 1; progress increases; A sees invite modal.
* [ ] A sends invite; B receives email with token + code + text preview.
* [ ] B signs up via link; pair connects; B's Slot 1 is active; A's Slot 2 is locked.
* [ ] B green-lights Round 1 → A gets turn email; A's Slot 2 active.
* [ ] Alternate to completion (10/10); completion screen reads all statements.
* [ ] RLS check: user outside the pair cannot access `/api/scorecard` for that pair.
* [ ] Idempotency: re-approving a completed slot doesn't duplicate; re-sending invite doesn't create duplicate members.

## M) Deployment & Ops

* [ ] Set **all env vars** in Vercel; mark `SUPABASE_SERVICE_ROLE_KEY` as **server-only**.
* [ ] Run migrations on Production database.
* [ ] Verify Resend sender domain (DKIM) or use shared to start.
* [ ] Deploy; run a full end-to-end live test (A→B→10/10).
* [ ] Create a minimal **/api/health** returning `{ ok: true }`.

---

**Done.** This checklist mirrors the UI flow and MVP scope precisely: secure auth, pair creation, turn-based approvals, invite/acceptance, notifications, and completion—nothing extra.