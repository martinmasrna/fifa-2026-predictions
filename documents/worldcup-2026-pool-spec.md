# World Cup 2026 Prediction Pool — Build Specification

A web app for a private friend group to predict the 2026 FIFA World Cup, with automatic
scoring from public results data and a live leaderboard.

## How to use this document
This is the complete, agreed specification. Build to it directly. Where a section says
**RECOMMENDATION** the choice is the builder's, but the recommended default is the
intended path. Where it says **INVARIANT**, that rule must not be relaxed — several of
them are load-bearing for fairness or security.

---

## 1. Product overview

- **Tournament:** 2026 FIFA World Cup — 48 teams, 12 groups of 4, 104 matches total
  (72 group stage + 32 knockout). Knockout path: Round of 32 → Round of 16 →
  Quarter-finals → Semi-finals → Third-place match → Final. Groups and teams are known
  (draw was December 2025).
- **Audience:** one private friend group. **Single pool = single deployment.** No
  multi-pool/SaaS layer, no pool-selection UI.
- **Roles:** one **owner** (admin) and **members**.
- **Joining:** members open the site URL, authenticate, and enter a shared **join code**.
- **Predictions lock at kickoff**, per match.
- **Results** come from the public **openfootball** 2026 JSON dataset (no API key).

---

## 2. Architecture

- **Frontend:** static SPA hosted on **GitHub Pages**. RECOMMENDATION: Vue 3 + Vite (any
  framework that builds to static assets is fine). Uses the Supabase JS client.
  - **Routing gotcha:** GitHub Pages has no SPA fallback, so a history-mode router returns
    404 on page refresh and deep links. Use **hash-mode routing** (Vue Router
    `createWebHashHistory`), or copy `index.html` to `404.html` at build time so the SPA
    reloads. Decide this up front — it bites in the first hour otherwise.
- **Data + auth:** **Supabase** (free tier is ample for a friend group).
- **Results ingestion + scoring:** a **scheduled GitHub Action** that holds a Supabase
  **service-role key** in GitHub Actions Secrets and writes results and scores to Supabase.
- **Repo visibility:** RECOMMENDATION: make the repo **public**. Action minutes are then
  unlimited (so polling cadence costs nothing), and it is safe — the only secret (the
  service-role key) lives in Actions Secrets, never in the code. The Supabase anon key is
  public by design and ships in the bundle.

### INVARIANT — security boundary
On a static site the Supabase anon key is visible to anyone. **Security is enforced
entirely by Supabase Row-Level Security (RLS) policies, not by the key.** Every table
must have RLS configured as specified in §4. UI-level gating is never a substitute, since
a member could query Supabase directly with the public key.

---

## 3. Scoring rules (the contract)

Implement all scoring in a **single, unit-tested module** shared by the GitHub Action.
Include hand-worked test cases for every tricky interaction below.

### 3.1 Group stage — per match
Evaluated on the **90-minute result only** (the `ft` score).

| Outcome | Points |
|---|---|
| Exact score | 7 |
| Correct result + correct goal difference | 5 |
| Correct result + one team's exact goals right | 4 |
| Correct result only (W/D/L) | 3 |
| Wrong result + one team's exact goals right | 1 |
| Completely wrong | 0 |

Definitions and edge cases:
- **Correct goal difference**: the margin between the two teams matches exactly
  (predict 2–1, actual 3–2 → both home-by-1 → fires).
- **One team's exact goals right**: one side's goal count in the prediction equals the
  actual (predict 2–1, actual 2–0 → home's 2 matches → fires).
- The "correct GD" and "one team right" bonuses can never both fire below an exact score
  (mathematically impossible).
- **Draws** always satisfy "correct result + correct GD" (GD = 0), so any draw prediction
  that catches a draw scores **minimum 5**.
- **Missing prediction = 0** (same as completely wrong).

### 3.2 Knockout — per match
Two independent components, summed. **Max per knockout match = 10.**

| Component | Basis | Points |
|---|---|---|
| Scoreline | 90-minute result (`ft`), using the §3.1 tiers exactly | 0–7 |
| Advancement | Predicted advancer = actual advancer | +3 (else 0) |

- The scoreline tiers are **identical** to the group stage and scored on the **90-minute
  `ft`** score (extra-time/penalty goals never affect the scoreline component).
- **No round multipliers.** Every knockout match is weighted the same regardless of round.
  INVARIANT.
- **Advancer in the prediction:** if the predicted scoreline is **decisive**, the advancer
  is auto-set to the predicted winner (no extra input). If the predicted scoreline is a
  **draw**, the player must additionally pick the advancer (two-way choice).
- **Actual advancer** is derived from the result with fallback `p → et → ft`
  (penalties if present, else extra-time aggregate, else 90-minute score).
- **Third-place match**: treated as a knockout tie; "advancer" means the winner.

### 3.3 Pre-tournament — three predictions, locked at first kickoff
- **Top 8 (quarter-finalists):** unordered set of 8 teams. **15 points per correct team.**
  Max 120.
- **Winner:** 25 points if correct. **Must be one of the player's own Top 8** (enforced in
  the UI). Resolves at the final.
- **Dark horse:** one team from a **curated list of 8 storyline teams** (set once in
  `dark_horse_teams.json`, each with a short narrative blurb — the pick is about the story,
  not the odds). Scored purely on **how far that team advances**, regardless of which team
  is picked: Round of 16 → **5**, Quarter-final → **10**, Semi-final → **20**,
  Runner-up → **30**, Winner → **50**.
- **Resolution timing** (computed by the Action): dark horse score is recomputed each time
  the picked team crosses a new milestone (Round of 16 → Quarter-final → Semi-final →
  Final), taking the highest tier reached; Top 8 once the eight quarter-finalists are
  known; winner at the final.

---

## 4. Data model

### 4.1 Reference data — committed JSON in the repo (read by app + Action)
Static, set once at setup. Not in Supabase, not editable in-app.
- **Match schedule** keyed by the **official FIFA match number (1–104)** — this is the
  **universal primary key** everywhere, stable regardless of which teams fill a knockout
  slot. Each entry: match_no, stage, group (if group stage), round label, kickoff (UTC),
  ground.
- **Teams**: the 48 teams with group assignments.
- **Dark-horse teams**: a curated, hand-picked list of 8 storyline teams, each with a short
  narrative blurb, in `dark_horse_teams.json`. Ships **pre-populated** — this is editorial
  content chosen by the owner up front, not derived from FIFA rankings, so there is no
  fill-in-before-go-live step.

### 4.2 Supabase tables
- **members** — `user_id` (PK, = Supabase auth uid), `display_name`, `email`, `is_owner`,
  `joined_at`.
- **matches** — `match_no` (PK), `stage`, `group`, `round_label`, `team1`, `team2`,
  `team1_resolved` (bool), `team2_resolved` (bool), `kickoff_utc`, `ground`, `status`
  (scheduled / live / final), `ft1`, `ft2`, `et1`, `et2`, `p1`, `p2`, `advancer`,
  `result_source` (`feed` | `manual`), `updated_at`.
- **predictions** — `id`, `user_id`, `match_no`, `pred1`, `pred2`,
  `pred_advancer` (null except on a predicted knockout draw), `created_at`, `updated_at`.
  Unique on (`user_id`, `match_no`).
- **pretournament_predictions** — `user_id` (PK), `top8` (8 team codes),
  `winner` (∈ top8), `dark_horse` (∈ the 8 storyline teams), `created_at`, `updated_at`.
- **prediction_scores** — `user_id`, `match_no`, `points`, plus a breakdown
  (`scoreline_pts`, `advance_pts`). Written by the service role only.
- **pretournament_scores** — `user_id`, `top8_pts`, `winner_pts`, `dark_horse_pts`.
  Written by the service role only.
- **sync_status** — single row: `last_sync_at`, `last_error`. Written by the Action.
- **standings_snapshots** — written by the Action at each round boundary so the round
  recap can compute rank deltas: `round_key` (e.g. `"matchday-3"`, `"Round of 16"`),
  `user_id`, `rank`, `total_points`, `captured_at`. Service-role write only.
- **leaderboard** — a Postgres **view** summing `prediction_scores` +
  `pretournament_scores` per member.

### 4.3 RLS policies
- **members**: any member may read the member list (names/emails); a member may write only
  their own row.
- **predictions**:
  - A member may **read** their own predictions at any time.
  - A member may **read another member's** prediction only **after that match's kickoff**
    (join to `matches.kickoff_utc`).
  - A member may **insert/update** their own prediction only while
    `matches.kickoff_utc > now()` — judged against the **server clock** (`now()`),
    never a client-supplied time. INVARIANT.
- **pretournament_predictions**: own read/write only before the first kickoff (match 1);
  readable by others after the first kickoff.
- **prediction_scores / pretournament_scores / sync_status / standings_snapshots**:
  readable by all members; **writable only by the service role.** INVARIANT.
- **matches**: readable by all members; result/resolution fields writable by the service
  role **and** by the owner (`is_owner`) — the owner path powers the admin override (§8).

---

## 5. Identity & joining

- **Auth:** Supabase **email magic link**. A member's identity is their Supabase
  `user_id`, durable across devices for the ~6-week tournament.
- **Config** (committed): pool name, `owner_email`, and a **hashed** `join_code`.
- **Join flow:** open URL → magic-link sign-in → if not yet a member, enter the join code
  and choose a display name → membership row created → pre-tournament onboarding (§6.1).
- **Owner:** the user whose email matches `owner_email` is auto-flagged `is_owner`.
- **Supabase auth setup:** add the deployed GitHub Pages URL to Supabase's **Site URL**
  and **allowed redirect URLs**, or magic-link logins will silently bounce. Configure this
  when wiring up auth (build order step 5), not after debugging a broken login.

---

## 6. Prediction experience

### 6.1 Pre-tournament onboarding — three separate screens
Runs immediately after joining. **One decision per screen** to keep cognitive load low.
- **Screen 1 — Top 8:** grid grouped by group (A–L), multi-select capped at 8, with a
  running "n/8" counter. Under-8 is allowed (Continue stays enabled with a soft note).
- **Screen 2 — Winner:** shows only the player's selected teams; pick one.
- **Screen 3 — Dark horse:** the 8 storyline teams shown with their narrative blurbs
  (no point values — the pick is about the story, scoring is the same curve for everyone);
  pick one; Finish.

Behaviour:
- Save on each Continue; progress persists. If a player leaves, they **resume at the first
  unfinished screen**, not the start.
- Back navigation allowed. If returning to Screen 1 removes the team that was the chosen
  winner, **clear the winner** so Screen 2 re-prompts cleanly (no silent invalid state).
- **Soft completion**: the player may exit into the app early; show a persistent "finish
  your pre-tournament picks" nudge until first kickoff. Not a hard gate.
- After onboarding, the three are individually editable from **My Picks** until first
  kickoff. Onboarding is just the guided first pass.
- **Late joiners** (after first kickoff): pre-tournament is already locked, so onboarding
  is skipped; the three appear locked / 0 in My Picks.
- All three lock at the **first kickoff** (match 1).

### 6.2 Group stage (72 matches)
- Per match: two goal steppers (team1, team2). No advancer.
- Entry surface: the schedule in **chronological order** with inline score fields (fill a
  whole matchday in one sitting); filters for open / upcoming / still-blank; plus a
  by-group browse.
- Each match editable until **its own kickoff**, then shown as locked.

### 6.3 Knockouts (32 matches)
- Per match: a 90-minute scoreline **plus an advancer**. The advancer field is **hidden**
  when the score is decisive (auto = predicted winner) and appears as a **two-way toggle**
  only when the prediction is a draw.
- **Prediction window** opens automatically when **both teams resolve** (from the feed)
  and closes at kickoff.
- Two views over the same data: an interactive **bracket** for orientation (unresolved
  ties show TBD slots) and an **"open for prediction now"** list as the entry surface.
- Third-place match behaves like any knockout tie.

### 6.4 Locking — INVARIANT
- Lock moment = the match's `kickoff_utc`. **No grace period.**
- Enforced server-side via the RLS write policy (§4.3) against `now()`. The UI greys out
  locked matches, but the database is the actual enforcement.

---

## 7. Results & scoring pipeline (GitHub Action)

A scheduled workflow (RECOMMENDATION: every ~10 minutes, cron in UTC; tighten on match
days if desired). Holds the Supabase service-role key from Actions Secrets. Run loop:

1. Fetch the latest openfootball 2026 JSON.
2. For each match, upsert schedule + resolution fields (including **resolved knockout team
   names** as slots fill). If the match is **not** `result_source = manual`, also upsert
   its result (`ft`/`et`/`p`) and status.
3. Flag matches that are newly **final** or changed. A **group** match is final once `ft`
   is present; a **knockout** match is final once a decider exists (`ft` if decisive, else
   `et`/`p`).
4. For every final match, **recompute every member's points from scratch** (idempotent),
   using the §3 module. Missing prediction = 0. Upsert `prediction_scores`.
5. Recompute pre-tournament milestone scores when boundaries are crossed (dark horse →
   each new milestone the picked team reaches, up to the final; Top 8 → eight
   quarter-finalists known; winner → final decided).
6. When a matchday or knockout round has just completed, write one `standings_snapshots`
   row per member for that round (`rank` + `total_points`), so the round recap can compute
   rank deltas ("biggest mover").
7. Write `sync_status.last_sync_at`. The `leaderboard` view reflects new totals
   automatically.

Properties:
- **Idempotent / self-healing.** Because step 4 recomputes from source, a corrected
  openfootball result or a manual override produces correct scores on the next run, with
  no reconciliation logic.
- **Override precedence:** `result_source = manual` makes the Action stop overwriting that
  match's result from the feed, while still scoring from it.
- **Data nature:** openfootball is a community-maintained **post-match results** dataset,
  not a live-scores feed. Scores appear shortly after full time with variable latency;
  this is expected. The admin override (§8) is the lever for the rare case of wanting a
  result in immediately.
- **Bracket resolution comes from the feed** (with the admin slot-resolution backstop in
  §8); the app does not compute the bracket itself in v1.

---

## 8. Views & social

### 8.1 Leaderboard (home)
- Ranked by total points, with a breakdown into three buckets: **group stage / knockouts /
  pre-tournament**.
- **Live-updating** via a Supabase realtime subscription, so the table reshuffles on its
  own as the Action writes scores.
- **Tiebreaker** (equal totals): most exact scorelines → most correct results → otherwise
  a genuinely **shared rank**.

### 8.2 Match detail + reveal
- Before lock: a member sees only their own prediction.
- After lock: the **full reveal** — every member's prediction for that match and the
  points each earned, with the viewer's own row highlighted.

### 8.3 My Picks
- All of a member's predictions with points on resolved ones; **inline editing** for
  anything not yet locked; the editable home for the pre-tournament three until first
  kickoff.

### 8.4 Navigation
Top level: **Leaderboard** (home) · **Matches** (schedule: predict upcoming, results +
reveal on past) · **Bracket** (knockout tree) · **My Picks**. The owner additionally sees
**Admin** (§9).

### 8.5 Fun layer (v1 scope)
- The per-match reveal (§8.2) and the stage breakdown (§8.1).
- A **round recap** when a matchday or knockout round completes: top scorer of the round,
  and the biggest mover — the rank delta computed from the `standings_snapshots` table
  (§4.2). This is the main reason to check back between matches.

---

## 9. Admin panel (owner only)

Deliberately small — live operational controls only.
- **Sync status:** `last_sync_at` ("last sync: 4 min ago") and the last error, so the
  owner can see the pipeline is alive without opening GitHub.
- **Result override:** pick a match, set the scoreline (and `et`/`p`/advancer for a
  knockout), save. Sets `result_source = manual`. NOTE: this corrects the result instantly,
  but the leaderboard catches up on the **next Action run** (≤10 min), because scores are
  service-role-only and the admin web client cannot write them directly.
- **Knockout slot resolution:** manually set a tie's two teams when the feed is slow to
  propagate who advanced, so the prediction window opens on time.
- **Members:** list (name, email, joined); **remove with confirm** (cascades that member's
  predictions and scores); **rotate join code** (a removed member otherwise still holds it).

Deliberately **not** included — INVARIANT:
- No unlocking matches or extending deadlines, even for the owner. There is no mechanism to
  predict after kickoff.
- No in-app config editing. Set-once data (team list, group assignments, dark-horse teams)
  lives in the committed reference JSON.

---

## 10. Non-goals (v1) and future hooks

Out of scope for v1: notifications/reminders, true live scoring, an instant-override
rescore function, multi-pool support, and the dropped social extras (head-to-head compare,
rank-over-time chart, superlatives).

Future hooks if ever wanted: email reminders fired from the Action; a small `rescore`
Supabase Edge Function to make admin overrides update the leaderboard instantly; a tighter
or match-day-windowed cron.

---

## 11. Suggested build order

1. Supabase project: schema (§4.2), the `leaderboard` view, and **all RLS policies (§4.3)
   first** — they are the security model, not an afterthought.
2. The committed reference JSON (§4.1): schedule, teams, dark-horse teams.
3. The scoring module (§3) with its unit tests — pure logic, no I/O, easy to verify.
4. The GitHub Action (§7) consuming the scoring module; confirm idempotent rescoring
   against a past tournament's data if useful.
5. Auth + join flow (§5) and pre-tournament onboarding (§6.1).
6. Group-stage and knockout prediction surfaces (§6.2–6.4).
7. Leaderboard, match reveal, My Picks, round recap (§8).
8. Admin panel (§9).
9. **Before go-live:** add the deployed Pages URL to Supabase's Site / redirect URLs; and confirm hash-mode (or
   `404.html`) routing actually works on the live Pages deployment.
