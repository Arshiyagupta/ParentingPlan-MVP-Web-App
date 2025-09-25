# UI Development Plan - SafeTalk MVP

## Design principles (MVP)

**Tone:** warm, neutral, non-judgmental. Reduce arousal and ambiguity.

**Layout:** single-column on mobile; centered, narrow two-column on desktop where helpful.

**Colors:** light UI with gentle neutrals; one accent.
- Background #F8FAFC (slate-50), Surface #FFFFFF, Text #0F172A (slate-900)
- Accent (brand): SafeTalk Green #218314 (buttons, active slot ring)
- Muted/Locked: #E5E7EB (gray-200), text #64748B (slate-500)
- Success: #16A34A; Warning (guardrail): #F59E0B

**Type:** System stack or Inter. Headings: semibold; body: normal; line-height 1.5+

**Motion:** minimal; subtle hover/focus; no bouncy animations (avoid agitating users)

**Accessibility:** 16px min body, 44px hit targets, WCAG AA contrast, focus outlines, ARIA labels

**Microcopy:** short, specific, validating (e.g., "We'll help you word this so it lands well.")

## Component inventory (build once, reuse)

**AppShell/Header**
- Left: wordmark "SafeTalk"
- Right: discreet user menu (email, "Log out")

**Buttons:** Primary (accent), Secondary (ghost), Destructive (red, rarely)

**Inputs:** Text, Email, Password (+ show/hide), Textarea (autosize), Validation text

**Cards:** Elevated surface for scorecard slots, chat area, empty states

**Badges/Chips:** "Active", "Locked", "Completed"

**Banner/Notice:** "Waiting for your co-parent to respond" (info state)

**Modal/Drawer:** Invite co-parent

**Toast:** success/error (top-right)

**Progress indicator:** 0/10 to 10/10 (linear bar)

**Avatar/Initials:** simple circle with initials (A/B) for chat bubbles

**Icons:** check (✓), lock (🔒), mail, hourglass, info

## Route map (Next.js)

- `/` Landing
- `/signup`, `/login`
- `/dashboard` (Scorecard)
- `/slot/[round]` (AI Brainstorm Chat for given round)
- `/connect` (fallback manual code entry—rarely used)
- `/complete` (Completion summary)

Emails are templates (not routes) but we'll note their content.

## Screen-by-screen specs

### 1) Landing (/)

**Purpose:** Simple entry. Let Parent A start immediately.

**Layout**
- Centered, narrow column (max-w 560)
- H1: "A calmer way to co-parent"
- Subcopy: one sentence about alternating good-quality rounds
- Primary CTA: Get started → /signup
- Secondary link: "Already have an account? Log in" → /login

**Components**
- Logo/Wordmark
- Primary button
- Footer (tiny): terms/privacy links (placeholder)

### 2) Sign up (/signup)

**Purpose:** Create account with minimum friction.

**Layout**
- Card (max-w 420), stacked fields
- Fields: Email, Password, Confirm Password
- Button: Create account
- Under button: "Have an account? Log in"
- Microcopy: "By continuing you agree to…"
- On submit → create user → generate connection code → redirect /dashboard

**Validation & States**
- Inline errors (email format, password length, mismatch)
- Disabled button while submitting
- Error toast on server failure

### 3) Log in (/login)

**Purpose:** Auth in.

**Layout**
- Same card style as sign up
- Fields: Email, Password
- Button: Log in
- Link: "Create account" → /signup
- (Optional later: "Forgot password?")

**States**
- Disabled while submitting; inline error on failure

### 4) Dashboard / Scorecard (/dashboard)

**Purpose:** Home base. Shows the 5-row scorecard, lock/turn status, and invites if needed.

**Layout**
- Header: AppShell
- Top bar:
  - Left: "Your scorecard"
  - Right: Progress bar 0/10 → 10/10 (fills as approved qualities lock)
- Banner (conditional):
  - Your turn (green left border) or
  - Waiting for your co-parent (blue left border)
- Grid (single column mobile; 2 columns desktop if desired):
  - Five Slot Cards (buttons):
    - **State: Active**
      - Accent ring, "Round X • Your turn"
      - Primary CTA: "Open to draft"
    - **State: Locked**
      - Gray surface, Lock icon, hint why: "Unlocks after your co-parent responds."
    - **State: Completed**
      - Check icon, shows final approved text (truncate to 2 lines with "See more")
- Right sidebar (desktop) or collapsible panel (mobile):
  - Pair status (Connected: A ↔ B; or Not connected)
  - Connection code (copyable)
  - Invite section:
    - If B not connected and A has completed Round 1: show Invite Co-parent button (opens modal)
    - If invite sent: show invitee email + "Resend" (rate limited)

**Microcopy:** "We'll go one at a time. Each message is polished with AI before it's shared."

**States**
- Pre-invite (A, Round 1 active): only Slot 1 is Active; others Locked
- Post-A Round 1 completion: all A slots Locked; Banner "Invite your co-parent to continue"
- B joined but hasn't done Round 1: A sees "Waiting for co-parent"; B sees Slot 1 Active
- During partner turn: disable all your slot buttons; banner explains why

**Interactions**
- Clicking an Active slot → navigate /slot/[round]
- "See more" on completed slot reveals full approved text (inline expand)
- Resend invite → toast "Invite re-sent"

### 5) AI Brainstorm Chat (/slot/[round])

**Purpose:** Draft → AI helps reword → user Green-Lights → slot locks.

**Layout**
- Header: Back to Scorecard
- Top strip:
  - Breadcrumb: "Round X • Your turn"
  - Small guidance text: "Draft the good quality. We'll help you phrase it so it lands well."
- Main area: Chat Card
  - Message list (scroll)
    - System welcome (muted): "What would you like to appreciate about your co-parent?"
    - User bubbles (right aligned), AI bubbles (left)
    - Each AI suggestion ends with subtle helper text: "If this sounds right, Green-Light it. Otherwise, tell me what to tweak."
  - Composer (fixed bottom within card)
    - Textarea (autosize, placeholder: "Write how you see their good quality…")
    - Actions row:
      - Secondary button: Ask to refine
      - Primary button: Green-Light (disabled until at least one AI suggestion exists)
- Right meta panel (optional on desktop; collapsible on mobile):
  - Guardrail hint: "We'll guide tone away from blame." (tiny)
  - Tone toggles (optional later): softer / direct (for MVP, keep static copy)

**States & Rules**
- First submit → send user draft to AI → render AI suggestion
- Green-Light: confirms and locks the approved_text for this round; then:
  - If you're Parent A on Round 1: open the Invite Co-parent Modal immediately
  - Otherwise: navigate back to /dashboard with success toast "Saved!"
- Block toxic phrasing: if user inputs aggressive words, show inline nudge:
  - "Let's rephrase so it's easier to receive. Try focusing on the positive behavior or impact."

### 6) Invite Co-parent (Modal)

**Purpose:** After Parent A completes Round 1, invite B.

**Trigger**
- Auto-opens right after A green-lights Round 1; also available from sidebar if dismissed.

**Layout**
- Title: "Invite your co-parent"
- Body:
  - Email field (required)
  - Read-only preview card:
    - "We'll include your approved message:"
    - "I appreciate how you always make time for school drop-offs."
  - Connection code (copyable) + subtle note "Included automatically in the invite"
- Actions:
  - Primary: Send invite
  - Secondary: Cancel (you can send later from the sidebar)

**States**
- Success → close modal → Dashboard shows "Invite sent to ___"
- Failure → inline error + toast

### 7) Connect (fallback) (/connect)

**Purpose:** Rare manual code entry (e.g., B received code separately).

**Layout**
- Card with a single input: "Enter your partner's connection code"
- Primary: Connect
- On success → /dashboard
- If accessed from invite link, prefill code and auto-submit on sign-up

### 8) Completion (/complete)

**Purpose:** Positive reinforcement after 10/10.

**Layout**
- Large checkmark + "10 Good Qualities Completed"
- Grid or list of all 10 approved statements
- Soft CTA (future): "Name one conflict to work on later" (disabled or simple text area stored only)
- Button: Back to scorecard

**States**
- Route is available once pair == completed

## Email templates (for reference)

**Invite:** Subject "{A} shared a good quality about you — your turn?"
Body: A's approved text + button "Join & Respond" (link includes token + code)

**Turn notification:** Subject "Your turn to add Good Quality #{n}"
Body: small recap + button "Open your turn"

(These aren't app screens, but the copy shapes expectations and the next UI state.)

## UI states & visuals to implement carefully

**Slot Card States**
- Active: white card, accent ring, "Your turn", primary CTA
- Locked: gray, lock icon, small caption "Unlocks after your co-parent responds"
- Completed: white, check icon, shows approved text, "See more"

**Banners**
- Success ("Saved!")
- Info ("Waiting for your co-parent to respond")
- Error ("Couldn't send invite. Try again.")

**Progress**
- Linear bar labeled "{count}/10 qualities approved"
- Increment when a slot is green-lit and written to DB

**Toasts**
- Short, non-intrusive; auto-dismiss in 3–4s

**Focus management**
- On modal open: focus email input
- On route change: focus H1
- Keyboard navigable (tab order, ESC closes modal)

## Styling cheatsheet (Tailwind-style hints)

**Containers:** max-w-[560px] mx-auto p-6 md:p-8

**Cards:** rounded-2xl border border-gray-200 bg-white shadow-sm

**Headings:** text-xl md:text-2xl font-semibold text-slate-900

**Body text:** text-slate-700

**Buttons (primary):** bg-[#218314] text-white hover:bg-[#1b6b11] disabled:opacity-50

**Buttons (ghost):** bg-white border border-gray-300 hover:bg-gray-50

**Inputs:** rounded-xl border-gray-300 focus:border-[#218314] focus:ring-[#218314]

**Banners:** rounded-xl border-l-4 p-4 (green/blue variations)

**Progress:** h-2 rounded-full bg-gray-200 with inner bg-[#218314]

## Data-driven rendering (what each screen needs)

**Dashboard**
- Pair status: notConnected | waitingForPartner | yourTurn | partnerTurn | completed
- Slot list for A and B with state per round: active/locked/completed + approved_text
- Invite status: none | sent | accepted
- Progress: countApproved (0–10)

**Chat**
- Round number, author (A/B), prior attempts (optional), latest AI suggestion
- Guardrail flags (toxicity boolean)

**Completion**
- Array of approved_text with author + round

## Minimal analytics hooks (optional but 1-line each)

signup_completed, slot_greenlit, invite_sent, invite_accepted, turn_unlocked, flow_completed

## UI flow (brief)

**Parent A**
1. /signup → /dashboard
2. Scorecard shows Slot 1 Active → open /slot/1
3. Draft → AI suggestion → Green-Light → back to /dashboard
4. Invite Modal pops → send invite → banner "Waiting for your co-parent"
5. Email arrives to B; A waits (can see progress = 1/10)

**Parent B**
6. Clicks email → signs up (code prefilled) → /dashboard
7. Sees A's Round 1 completed; their Slot 1 Active
8. Opens /slot/1 → Green-Lights → back to /dashboard
9. A receives "Your turn for #2"; A's Slot 2 Active

**Both (Rounds 2–5)**
10. Alternate: active → chat → green-light → notify partner → next slot unlocks
11. Progress climbs to 10/10

**Completion**
12. When both finish Round 5 → /complete (summary) → "Back to scorecard"