# SafeTalk MVP – Database Design (Postgres / Supabase)

## Overview (Entities & Relationships)

* **profiles** (1) ⟷ (M) **pair\_members** (M) ⟷ (1) **pairs**
* **pairs** (1) ⟷ (M) **qualities**
* **pairs** (1) ⟷ (M) **invites**
* **pairs / profiles** (optional) ⟷ (M) **events**

A **pair** represents one co-parent dyad. A **profile** is a user account. **pair\_members** binds users to a pair and assigns role **A** or **B**. **qualities** stores each approved good-quality statement per round and role. **invites** handles the tokenized invitation flow from Parent A to Parent B. **events** (optional) records product analytics milestones.

---

## Enum Types (recommended)

* **turn\_role**: `'A' | 'B'`
* **pair\_status**: `'active' | 'completed'`
* **invite\_status**: `'sent' | 'accepted' | 'expired'`

---

## Table: `profiles`

**Purpose:** One row per user. Extends the auth user with app-specific fields and a short, human-shareable **connection\_code** used to connect co-parents.

**Columns & Constraints**

* **id** (uuid, PK) – Foreign key to `auth.users.id`.
* **email** (text, not null, unique) – Redundant copy for convenient joins and emailing.
* **connection\_code** (text, not null, unique) – 6–8 uppercase characters; shown to the user and included in invite emails.
* **created\_at** (timestamptz, not null, default now()) – Record creation timestamp.

**Keys & Indexes**

* PK: **(id)**
* UNIQUE: **(email)**, **(connection\_code)**

**Notes**

* Generate `connection_code` on first profile creation and guarantee uniqueness app-side.
* RLS: users may only read/update their own profile.

---

## Table: `pairs`

**Purpose:** The core container for a co-parent dyad. Tracks the **current round** (1–5), **whose turn** it is, and overall **status**.

**Columns & Constraints**

* **id** (uuid, PK, default gen\_random\_uuid()) – Pair identifier.
* **status** (pair\_status, not null, default `'active'`) – `'active'` during rounds; `'completed'` after both finish round 5.
* **current\_round** (smallint, not null, default 1) – Ranges 1–5; increment when both A and B complete a round.
* **current\_turn** (turn\_role, not null, default `'A'`) – Alternates after each approval.
* **created\_at** (timestamptz, not null, default now()) – Pair creation timestamp.

**Keys & Indexes**

* PK: **(id)**

**Notes**

* All **turn/round transitions** happen in server logic atomically (transaction) after a quality is approved.

---

## Table: `pair_members`

**Purpose:** Associates users with a pair and assigns a fixed role (`A` or `B`). Exactly two rows per pair once both have joined.

**Columns & Constraints**

* **pair\_id** (uuid, not null, FK → pairs.id, on delete cascade) – The pair.
* **user\_id** (uuid, not null, FK → profiles.id, on delete cascade) – The user.
* **role** (turn\_role, not null) – `'A'` for initiator, `'B'` for invitee (in MVP).
* **joined\_at** (timestamptz, not null, default now()) – When the user became a member.

**Keys & Indexes**

* PK: **(pair\_id, user\_id)**
* UNIQUE: **(pair\_id, role)** – Prevents two "A"s or two "B"s in the same pair.

**Notes**

* When Parent B accepts the invite, insert their row with `role='B'`.
* RLS ensures only members can read their pair relationships.

---

## Table: `qualities`

**Purpose:** Stores each approved "good quality" statement per **pair**, **author\_role (A/B)**, and **round\_number (1–5)**. This is the canonical record used to render the scorecard.

**Columns & Constraints**

* **id** (uuid, PK, default gen\_random\_uuid()) – Statement identifier.
* **pair\_id** (uuid, not null, FK → pairs.id, on delete cascade) – The dyad this entry belongs to.
* **author\_role** (turn\_role, not null) – `'A'` or `'B'`; who authored/approved the text.
* **round\_number** (smallint, not null, check 1..5) – The slot index for this author.
* **draft\_text** (text, nullable) – (Optional) Last user draft sent to AI; not required in MVP.
* **ai\_suggested\_text** (text, nullable) – (Optional) Last suggestion returned by AI; not required in MVP.
* **approved\_text** (text, nullable) – The final green-lit text that appears on the scorecard.
* **approved\_at** (timestamptz, nullable) – Time of green-light approval.
* **created\_at** (timestamptz, not null, default now()) – Creation timestamp.

**Keys & Indexes**

* PK: **(id)**
* UNIQUE: **(pair\_id, author\_role, round\_number)** – Ensures one row per side per round.
* INDEX: **(pair\_id, round\_number)** – Efficient fetching of 5 rounds for a pair.

**Notes**

* The **server** enforces turn/round correctness before creating/updating a row.
* The UI can display the **approved\_text**; drafts/suggestions are optional fields for future coaching history.

---

## Table: `invites`

**Purpose:** Manages the invitation from Parent A to Parent B, including the **tokenized link** used to accept and connect accounts.

**Columns & Constraints**

* **id** (uuid, PK, default gen\_random\_uuid()) – Invite record identifier.
* **pair\_id** (uuid, FK → pairs.id, on delete cascade) – The pair that issued the invite.
* **inviter\_user\_id** (uuid, not null, FK → profiles.id, on delete cascade) – The user who sent the invite (usually role A).
* **invitee\_email** (text, not null) – Email address of the invitee (future Parent B).
* **token** (uuid, not null, default gen\_random\_uuid()) – One-time token embedded in the email link.
* **status** (invite\_status, not null, default `'sent'`) – `'sent'`, `'accepted'`, or `'expired'`.
* **created\_at** (timestamptz, not null, default now()) – When the invite was created.
* **accepted\_at** (timestamptz, nullable) – When the invite was accepted.

**Keys & Indexes**

* PK: **(id)**
* INDEX: **(token)** – Fast lookup from email link.
* INDEX: **(invitee\_email)** – Useful for verifying if an email was previously invited.

**Notes**

* On acceptance (via the token link), create **pair\_members** row with `role='B'`, mark invite as `'accepted'`, and prefill the connection for the new account.
* Invites are generated after **Parent A** completes their **first approved quality**.

---

## Table: `events` (optional but recommended)

**Purpose:** Lightweight analytics/audit trail for the MVP funnel—helps you understand engagement without a separate analytics stack initially.

**Columns & Constraints**

* **id** (uuid, PK, default gen\_random\_uuid()) – Event identifier.
* **pair\_id** (uuid, nullable, FK → pairs.id, on delete cascade) – Context pair (if known).
* **user\_id** (uuid, nullable, FK → profiles.id, on delete cascade) – Actor (if known).
* **type** (text, not null) – Event name, e.g., `'signup_completed'`, `'invite_sent'`, `'invite_accepted'`, `'slot_greenlit'`, `'turn_unlocked'`, `'flow_completed'`.
* **metadata** (jsonb, nullable) – Small JSON payload (e.g., `{ "round": 3, "role": "A" }`).
* **created\_at** (timestamptz, not null, default now()) – Timestamp.

**Keys & Indexes**

* PK: **(id)**
* INDEX: **(pair\_id, created\_at)**
* INDEX: **(user\_id, created\_at)**

**Notes**

* This table is **read-only** to clients (writes via server only). Keep payloads small and anonymized where possible.

---

## Recommended View (optional): `scorecard_slots_v`

**Purpose:** Convenience read model to simplify the scorecard fetch—returns five rows with A/B states and text for a given pair.

**Conceptual Output (not a table, but a helpful abstraction)**

* **pair\_id**, **round\_number** (1–5)
* **a\_state** (`'locked' | 'active' | 'completed'`)
* **a\_text** (approved text or null)
* **b\_state** (`'locked' | 'active' | 'completed'`)
* **b\_text** (approved text or null)

**Notes**

* You can build this via a SQL view that joins `pairs` and `qualities`, then a small server mapper that computes states from `pairs.current_round` and `pairs.current_turn`.

---

## Integrity & Business Rules (enforced by schema + server logic)

1. **Exactly one author per side per round**

   * Enforced with `UNIQUE (pair_id, author_role, round_number)` in **qualities**.
2. **Fixed roles per pair**

   * Enforced with `UNIQUE (pair_id, role)` in **pair\_members**.
3. **Turn order and progression**

   * Enforced in server transactions:

     * A(1) → B(1) → A(2) → B(2) → … → A(5) → B(5).
     * After each approval, update `pairs.current_turn`; after both sides of a round complete, increment `pairs.current_round`.
     * When `current_round` would exceed 5 after completion, set `pairs.status='completed'`.
4. **Invite flow**

   * After **A** approves Round 1, create an **invites** row and email the invite with `token` and A's first approved text preview.
   * On acceptance, add **pair\_members** for **B** and mark invite `'accepted'`.
5. **Membership access (RLS)**

   * Only **pair members** can read their pair, qualities, invites (as applicable).
   * Writes go through server routes that validate membership and turn rules.

---

## Minimal Indexing Strategy

* **profiles**: UNIQUE on `(email)`, `(connection_code)` for lookups and collisions.
* **pairs**: PK only; most reads are by `id` after joining from `pair_members`.
* **pair\_members**: PK `(pair_id, user_id)` and UNIQUE `(pair_id, role)`; supports frequent joins from user → pair and vice versa.
* **qualities**: `(pair_id, round_number)` index for loading scorecards quickly.
* **invites**: `(token)` for invite acceptance; `(invitee_email)` for deduping or diagnostics.
* **events**: `(pair_id, created_at)` and `(user_id, created_at)` for simple timelines.

---

## Data Lifecycle (MVP)

* **Create pair** when Parent A first needs it (e.g., upon first approval of Round 1 if one doesn't exist yet).
* **Add members**: A joins as role `'A'` initially; B joins as `'B'` on invite acceptance.
* **Qualities** are inserted/updated only on **Green-Light** to keep the scoreboard source-of-truth simple.
* **Completion** occurs automatically when both A and B complete Round 5; pair status flips to `'completed'`.
* **Deletion**: Cascade deletes from `pairs` will remove `pair_members`, `qualities`, `invites`, and `events` linked to that pair (use with caution in admin tooling only).

---

This schema gives you a **tight, minimal, and coherent** backend for the MVP: every screen and state in your UI maps cleanly to one or two tables, queries are straightforward, and constraints prevent invalid sequences by construction.