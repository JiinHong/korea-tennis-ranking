# Admin Player Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-free player management page where sensitive player additions, renames, and status changes are protected by a one-time admin secret prompt.

**Architecture:** `/admin/players` is a server-rendered operations page backed by a read-only Supabase repository and a focused client component for forms. Mutations go through one Next.js route and one narrowly scoped `SECURITY DEFINER` RPC that validates a bcrypt hash stored in `private.app_secrets`, updates player and season-player rows atomically, normalizes visible ranks, and writes both ranking and admin audit events.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres 17, `@supabase/supabase-js` 2.110.2, Vitest, Testing Library.

## Global Constraints

- Follow RED-GREEN-REFACTOR for every behavior change.
- Do not add login, expose a service-role key, persist the entered admin secret, or return it in an API response.
- Require the admin secret for add, rename, and status changes.
- Preserve players and match history; `left` is a soft-delete state.
- Keep non-left ranks contiguous and move `left` rows behind the visible ranking.
- Add new or reactivated players at the bottom of the visible ranking.
- Keep `private.app_secrets` out of the Data API and do not change its RLS state without explicit user approval.
- Keep the admin interface dense, responsive, and operational rather than decorative.

---

### Task 1: Admin Player Read Model

**Files:**
- Create: `lib/supabaseAdminPlayers.ts`
- Create: `lib/supabaseAdminPlayers.test.ts`

**Interfaces:**
- Produces `AdminPlayerClub`, `AdminSeasonPlayer`, and `getAdminPlayerClubs(adapter?)`.
- `AdminPlayerClub` contains the active club, current season, and every current-season player including `left` rows.
- Players are ordered by `currentRank`; clubs are ordered with Korean collation.

- [ ] Write adapter-driven tests for active/injured/inactive/left players, clubs without a current season, and relation mapping.
- [ ] Run `npm test -- lib/supabaseAdminPlayers.test.ts` and verify failure because the module does not exist.
- [ ] Implement the pure reducer and Supabase adapter using existing public SELECT policies.
- [ ] Run the focused test and verify it passes.

### Task 2: Guarded Player Mutation RPC

**Files:**
- Create with Supabase CLI: `supabase/migrations/<timestamp>_manage_admin_players.sql`
- Create: `supabase/migrations/adminPlayerMigrations.test.ts`

**Interfaces:**
- Produces `public.manage_admin_player_with_secret(p_action, p_club_slug, p_season_player_id, p_name, p_status, p_admin_secret) returns jsonb`.
- Supported actions are `add`, `rename`, and `status`.
- Uses `private.app_secrets.name = 'admin_write'` and `extensions.crypt` for verification.
- Writes `ranking_events` and `admin_action_logs` in the same transaction.

- [ ] Write a migration contract test that requires an empty search path, secret verification, input validation, audit writes, rank normalization, explicit revokes, and a narrow anon grant.
- [ ] Run `npm test -- supabase/migrations/adminPlayerMigrations.test.ts` and verify failure because the migration does not exist.
- [ ] Create the migration with `supabase migration new manage_admin_players`.
- [ ] Implement the RPC and a non-exposed rank-normalization helper.
- [ ] Run the focused migration test and verify it passes.
- [ ] Apply the migration through the connected Supabase project, then run a transaction-wrapped add/rename/status smoke test that rolls back.

### Task 3: Server Command Boundary

**Files:**
- Create: `lib/supabaseAdminPlayerCommands.ts`
- Create: `lib/supabaseAdminPlayerCommands.test.ts`

**Interfaces:**
- Produces `manageAdminPlayer(input, adapter?)` and typed `AdminPlayerMutation` variants.
- The default adapter calls `manage_admin_player_with_secret` with the publishable server client.
- Supabase SQLSTATE `42501` becomes an `AdminPlayerCommandError` with `kind = 'forbidden'`.

- [ ] Write tests for RPC parameter mapping, response validation, forbidden errors, and ordinary database validation errors.
- [ ] Run the focused test and verify RED.
- [ ] Implement the typed command boundary without logging or retaining `adminSecret`.
- [ ] Run the focused test and verify GREEN.

### Task 4: Admin Player API

**Files:**
- Create: `app/api/admin/clubs/[club]/players/route.ts`
- Create: `app/api/admin/clubs/[club]/players/route.test.ts`

**Interfaces:**
- `POST` accepts `{ name, adminSecret }` and performs `add`.
- `PATCH` accepts `{ seasonPlayerId, operation: 'rename' | 'status', name?, status?, adminSecret }`.
- Returns `201` for add, `200` for update, `400` for malformed/domain input, `403` for a wrong secret, and `404` for an unknown club.

- [ ] Write route tests for valid add/rename/status, malformed bodies, unsupported statuses, unknown clubs, and forbidden errors.
- [ ] Run the focused route test and verify RED.
- [ ] Implement strict body parsing and route-to-command mapping.
- [ ] Run the focused test and verify GREEN.

### Task 5: Player Management UI

**Files:**
- Create: `app/admin/players/page.tsx`
- Create: `app/admin/players/page.test.tsx`
- Create: `app/admin/players/AdminPlayerManager.tsx`
- Create: `app/admin/players/AdminPlayerManager.test.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- `/admin` exposes a clear `선수 관리` navigation action.
- `/admin/players` renders club tabs, player search, rank/name/status rows, and an add action.
- Add, rename, and status controls open a compact confirmation dialog containing a password field.
- Successful mutations clear the secret, close the dialog, and call `router.refresh()`.

- [ ] Write page tests for live player data, noindex metadata, and dashboard navigation.
- [ ] Write client tests proving the secret field appears only after a mutation starts, each operation sends the expected request, failures stay visible, and success refreshes.
- [ ] Write CSS tests for a fixed desktop table layout and a compact mobile row layout without horizontal overflow.
- [ ] Run focused tests and verify RED.
- [ ] Implement the server page, client manager, and scoped admin styles.
- [ ] Run focused tests and verify GREEN.

### Task 6: Secret Provisioning, Verification, And Delivery

- [ ] Generate a high-entropy 24-character hexadecimal admin secret and store only its bcrypt hash as `private.app_secrets.admin_write`.
- [ ] Run one real wrong-secret request and verify it is rejected without changing rows.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Run Supabase security and performance advisors and confirm no unintended grant or RLS regression.
- [ ] Inspect `/admin` and `/admin/players` at desktop and 412x915 mobile viewports; save screenshots and check console output.
- [ ] Commit on a feature branch, fast-forward `main`, push, wait for Vercel, and verify production `/admin/players`.
