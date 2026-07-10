# Public Match Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a public user submit a valid campus ranking match and atomically persist the match, rank movement, and ranking event in Supabase.

**Architecture:** The client opens a focused match-entry dialog and posts player IDs, scores, and a per-submission idempotency key to the existing club match Route Handler. The Route Handler performs fast TypeScript validation, then calls one narrowly scoped Postgres function that locks the current ranking and repeats authoritative validation before writing every related change in one transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, Supabase Postgres 17, `@supabase/supabase-js`.

## Global Constraints

- Follow TDD for every behavior change.
- Public submission requires no login and no user-entered name.
- Never expose a service-role key or admin secret to the browser.
- A duplicate request with the same source key must not create a second match.
- Score, challenge-range, active-player, and rematch-cooldown rules are enforced in Postgres as well as TypeScript.
- Match insertion, rank movement, and ranking-event insertion must commit or roll back together.
- After success, the dialog closes and the ranking page reloads its data.
- The `CAMPUS FEED` heading must have a clear section break after the recent-match panel on mobile and desktop.

---

### Task 1: Atomic Supabase Match Command

**Files:**
- Create: `supabase/migrations/<generated>_record_public_match.sql`
- Modify: `lib/supabaseServer.ts`
- Create: `lib/supabaseMatchCommands.ts`
- Create: `lib/supabaseMatchCommands.test.ts`

**Interfaces:**
- Produces `recordSupabaseMatch(clubSlug, input, sourceKey): Promise<RecordedMatch>`.
- Produces Postgres function `public.record_public_match(text, uuid, uuid, integer, integer, date, text) -> jsonb`.

- [ ] Write a failing adapter test proving the TypeScript command calls `rpc("record_public_match", params)` and returns the normalized match result.
- [ ] Run `npm test -- lib/supabaseMatchCommands.test.ts` and confirm the missing module is the expected failure.
- [ ] Add the minimal server command and verify the test passes.
- [ ] Generate a migration with `npx supabase migration new record_public_match`.
- [ ] Implement the function with row locking, idempotency lookup, active-player/range/cooldown checks, match insertion, rank-chain movement, and `ranking_events` insertion.
- [ ] Revoke function execution from `PUBLIC` and grant only the role used by the server-side Supabase client.
- [ ] Apply the migration and run a rollback-only SQL fixture that verifies defender-win, challenger-win, and duplicate-key behavior without changing production data.

### Task 2: Persisting Route Handler

**Files:**
- Modify: `app/api/clubs/[club]/matches/route.test.ts`
- Modify: `app/api/clubs/[club]/matches/route.ts`

**Interfaces:**
- `GET /api/clubs/[club]/matches` returns active match-entry options `{ id, name, rank }[]`.
- `POST /api/clubs/[club]/matches` accepts `{ player1Id, player2Id, player1Score, player2Score, sourceKey }` and returns HTTP 201 only after persistence.

- [ ] Replace the validation-only success test with a failing persistence test.
- [ ] Add failing tests for player options, missing source key, duplicate players, and database-command errors.
- [ ] Run the focused route tests and confirm the expected failures.
- [ ] Implement GET options, server-side Seoul date selection, and the call to `recordSupabaseMatch`.
- [ ] Run the focused tests and the complete test suite.

### Task 3: Public Match Entry Dialog

**Files:**
- Create: `app/[club]/MatchEntryDialog.tsx`
- Create: `app/[club]/MatchEntryDialog.test.tsx`
- Modify: `app/[club]/ClubRankingClient.tsx`
- Modify: `app/[club]/ClubRankingClient.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- `MatchEntryDialog` receives `clubSlug`, `open`, `onClose`, and `onRecorded`.
- The dialog loads current active options when opened and submits a stable `crypto.randomUUID()` source key.

- [ ] Write failing interaction tests for opening, selecting two players, entering scores, successful submission, error feedback, and closing.
- [ ] Write a failing page test for the `경기 결과 입력` action and a CSS regression test for the `CAMPUS FEED` section gap.
- [ ] Run focused tests and confirm they fail for the missing UI and spacing rule.
- [ ] Implement the accessible dialog, compact hero action, loading/error/success states, and ranking refresh callback.
- [ ] Add a 24px section gap between the recent-match panel and activity feed without adding decorative containers.
- [ ] Run focused tests and the complete suite.

### Task 4: Verification and Release

**Files:**
- Modify only files required by issues found during verification.

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Start the dev server and inspect Seoultech and PETC at desktop and 412px mobile widths.
- [ ] Capture ranking, dialog, validation-error, and post-submit-success states; correct spacing or overflow issues found visually.
- [ ] Run Supabase security and performance advisors after the migration.
- [ ] Commit the verified changes and push `main` to `origin`.
