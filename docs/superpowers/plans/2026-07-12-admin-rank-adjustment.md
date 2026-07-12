# Admin Rank Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators preview and atomically correct a current-season player's rank while preserving unique contiguous ranks and recording audit history.

**Architecture:** A pure TypeScript helper builds the client preview from the loaded roster. A server-only command adapter calls a focused guarded Supabase RPC; the RPC locks the season roster, applies the complete shift in one transaction, and records ranking and admin audit events. The existing admin player route and page expose the operation without changing public ranking contracts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres, `@supabase/supabase-js`, Vitest, Testing Library.

## Global Constraints

- Follow TDD: observe a focused failing test before each behavior implementation.
- Do not change `initial_rank`, past matches, or any ranking rule.
- Do not allow `left` players to move or occupy selectable target ranks.
- Require the existing admin secret only when applying the mutation.
- Keep the existing add, rename, and status RPC signature unchanged.
- Use one atomic database function with roster locking and schema-qualified names.
- Record both `admin_rank_adjusted` and `change_rank` audit entries.

---

### Task 1: Pure Rank Adjustment Preview

**Files:**
- Create: `lib/adminRankAdjustment.ts`
- Create: `lib/adminRankAdjustment.test.ts`

**Interfaces:**
- Consumes: `AdminSeasonPlayer[]`, selected `seasonPlayerId`, and integer `targetRank`.
- Produces: `buildAdminRankAdjustmentPreview(players, seasonPlayerId, targetRank): AdminRankAdjustmentPreview | null`.
- `AdminRankAdjustmentPreview` contains `oldRank`, `targetRank`, and ordered `changes` with `seasonPlayerId`, `name`, `oldRank`, and `newRank`.

- [ ] **Step 1: Write failing preview tests**

Cover rank 5 to 2, rank 2 to 5, unchanged rank returning `null`, invalid or left player returning `null`, and target bounds based only on non-left players.

```ts
expect(buildAdminRankAdjustmentPreview(players, "sp-5", 2)?.changes).toEqual([
  { seasonPlayerId: "sp-5", name: "5위", oldRank: 5, newRank: 2 },
  { seasonPlayerId: "sp-2", name: "2위", oldRank: 2, newRank: 3 },
  { seasonPlayerId: "sp-3", name: "3위", oldRank: 3, newRank: 4 },
  { seasonPlayerId: "sp-4", name: "4위", oldRank: 4, newRank: 5 },
]);
```

- [ ] **Step 2: Verify RED**

Run `npm test -- lib/adminRankAdjustment.test.ts` and expect failure because the helper module does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Sort a copy by `currentRank`, filter the selectable roster to statuses other than `left`, reject invalid input, and calculate only the selected and interval players.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm test -- lib/adminRankAdjustment.test.ts` and commit the helper and tests.

---

### Task 2: Atomic Supabase Rank Command

**Files:**
- Modify: `supabase/migrations/20260712024408_adjust_admin_player_rank.sql`
- Create: `supabase/migrations/adminRankAdjustmentMigrations.test.ts`
- Modify: `lib/supabaseAdminPlayerCommands.ts`
- Modify: `lib/supabaseAdminPlayerCommands.test.ts`

**Interfaces:**
- Database function: `public.adjust_admin_player_rank_with_secret(p_club_slug text, p_season_player_id uuid, p_target_rank integer, p_admin_secret text) returns jsonb`.
- TypeScript mutation: `{ action: "rank"; clubSlug; seasonPlayerId; targetRank; adminSecret }`.
- Result extends the existing player result with `action: "rank"`, `oldRank`, and `changes`.

- [ ] **Step 1: Write failing migration contract tests**

Assert the SQL contains secret verification, active club/current season lookup, ordered `FOR UPDATE`, left-player rejection, non-left target bounds, temporary rank offset, both movement directions, `admin_rank_adjusted`, `change_rank`, and explicit revoke/grant statements.

- [ ] **Step 2: Verify migration tests RED**

Run `npm test -- supabase/migrations/adminRankAdjustmentMigrations.test.ts` and expect missing SQL behavior assertions.

- [ ] **Step 3: Implement the guarded RPC**

Use `security definer set search_path = ''`. Lock all season rows, load the selected row, validate the target against non-left count, offset every rank above the unique range, then restore ranks with a single `CASE` update. Build final `changes` from old/new rank values and insert both audit rows before returning JSON.

- [ ] **Step 4: Verify migration tests GREEN**

Run the focused migration test.

- [ ] **Step 5: Write failing command-adapter tests**

Assert the rank mutation calls:

```ts
rpc("adjust_admin_player_rank_with_secret", {
  p_club_slug: "seoultech",
  p_season_player_id: "sp-5",
  p_target_rank: 2,
  p_admin_secret: "secret",
});
```

Also reject malformed response data, map `42501` to `forbidden`, map `22023` to `validation`, and hide unexpected database details.

- [ ] **Step 6: Verify command tests RED, implement, then verify GREEN**

Run `npm test -- lib/supabaseAdminPlayerCommands.test.ts`, implement a separate rank RPC branch without changing existing RPC parameters, then rerun the test.

- [ ] **Step 7: Commit the database and command slice**

Commit the migration, migration contract tests, command adapter, and command tests together.

---

### Task 3: Admin Player API Rank Operation

**Files:**
- Modify: `app/api/admin/clubs/[club]/players/route.ts`
- Modify: `app/api/admin/clubs/[club]/players/route.test.ts`

**Interfaces:**
- Request body: `{ operation: "rank", seasonPlayerId: string, targetRank: number, adminSecret: string }`.
- Success: `{ ok: true, player: AdminPlayerRankMutationResult }`.
- Validation only accepts a positive integer target rank; the RPC enforces roster-specific bounds.

- [ ] **Step 1: Add failing route tests**

Cover a valid rank request, zero/negative/fractional/string target values, missing secret, unknown club, forbidden secret, safe validation response, and generic unexpected error.

- [ ] **Step 2: Verify RED**

Run `npm test -- 'app/api/admin/clubs/[club]/players/route.test.ts'` and expect the valid operation to return 400.

- [ ] **Step 3: Implement the rank route branch**

Reuse existing body parsing and command error handling. Add a small `isPositiveInteger` guard and pass the typed rank mutation to `manageAdminPlayer`.

- [ ] **Step 4: Verify GREEN and commit**

Run the focused route test and commit the API slice.

---

### Task 4: Admin Rank Preview Dialog

**Files:**
- Modify: `app/admin/players/AdminPlayerManager.tsx`
- Modify: `app/admin/players/AdminPlayerManager.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Adds `{ kind: "rank"; player: AdminSeasonPlayer }` to the existing dialog union.
- Uses `buildAdminRankAdjustmentPreview` for display only.
- Sends the Task 3 request contract and refreshes the server page after success.

- [ ] **Step 1: Write failing component tests**

Assert non-left rows expose an accessible `순위 변경` button, left rows do not, opening shows the current rank and target select, upward/downward previews list exact shifts, unchanged rank cannot submit, a valid request includes the secret, and a failed request clears the secret while retaining the dialog.

- [ ] **Step 2: Verify component tests RED**

Run `npm test -- app/admin/players/AdminPlayerManager.test.tsx` and expect the rank action to be absent.

- [ ] **Step 3: Implement the dialog behavior**

Extend existing dialog state rather than creating a second modal system. Render a compact affected-player list, keep the submit command disabled when no preview exists, and preserve all existing add/rename/status behavior.

- [ ] **Step 4: Add failing CSS regression assertions**

Assert the preview has stable two-column rank values, responsive overflow protection, and no nested card styling.

- [ ] **Step 5: Implement scoped responsive styles**

Use existing admin spacing, border, and typography variables. Keep the row actions wrap-safe on narrow mobile viewports.

- [ ] **Step 6: Verify GREEN and commit**

Run the component and global CSS tests, then commit the UI slice.

---

### Task 5: Supabase and Production Verification

**Files:**
- No new production files expected.

- [ ] Run `npm test` and require every test to pass.
- [ ] Run `npm run lint` and require zero lint errors.
- [ ] Run `npm run build` and verify the admin and API routes compile.
- [ ] Apply `20260712024408_adjust_admin_player_rank.sql` to Supabase project `ltxoewsvzhumsudwrzdq`.
- [ ] Query function privileges to confirm `public` and `authenticated` cannot execute the RPC.
- [ ] Run Supabase security and performance advisors and compare new notices against the pre-change baseline.
- [ ] Use a transaction that is rolled back to exercise upward and downward movement against real current-season rows without changing production ranks.
- [ ] Start the app and inspect `/admin/players` on desktop and 390x844 mobile; verify no overflow, exact preview copy, keyboard labels, and error state.
- [ ] Run a final code review, merge the feature branch into `main`, push, wait for Vercel Production `Ready`, and verify the deployed admin page responds successfully.
