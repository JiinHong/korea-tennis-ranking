# Admin Dashboard Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-free, read-only `/admin` operations dashboard and encode which future admin actions require the server-side admin secret.

**Architecture:** A server-only Supabase repository reads the existing public RLS-safe tables and reduces them into one overview model per active club. The server-rendered admin page consumes that model directly. A separate pure TypeScript policy module defines secret requirements so future mutation routes share one source of truth.

**Tech Stack:** Next.js 16 App Router, React 19 server components, TypeScript, Supabase Postgres, `@supabase/supabase-js`, Vitest.

## Global Constraints

- Follow TDD for every behavior change.
- Do not add login or expose a service-role/admin secret to the browser.
- This slice is read-only; it must not create, edit, or delete database rows.
- Keep the admin interface dense, restrained, and mobile responsive.
- Keep cards at 8px radius or less and avoid nested cards.

---

### Task 1: Admin Action Policy

**Files:**
- Create: `lib/adminActionPolicy.ts`
- Create: `lib/adminActionPolicy.test.ts`

**Interfaces:**
- Produces `AdminAction`, `ADMIN_ACTIONS`, and `requiresAdminSecret(action)`.
- Read/preview/export actions return `false`.
- Player, match, injury, ranking, settlement, season, import, and rule mutations return `true`.

- [ ] Write tests that enumerate both non-sensitive and sensitive actions.
- [ ] Run `npm test -- lib/adminActionPolicy.test.ts` and verify RED.
- [ ] Implement the typed policy table and lookup function.
- [ ] Run the focused test and verify GREEN.

### Task 2: Supabase Admin Overview Repository

**Files:**
- Create: `lib/supabaseAdminRepository.ts`
- Create: `lib/supabaseAdminRepository.test.ts`

**Interfaces:**
- Produces `AdminClubOverview` and `getAdminClubOverviews(adapter?, today?)`.
- The adapter loads active clubs, current seasons, season players, confirmed matches, approved injuries, and rule configs.
- The result contains roster status counts, match count/latest date, active injury count, and current rule values for each club.

- [ ] Write adapter-driven tests for two clubs, status counts, active injury dates, and a club without a current season.
- [ ] Run `npm test -- lib/supabaseAdminRepository.test.ts` and verify RED.
- [ ] Implement the reducer and Supabase adapter using only existing public SELECT policies.
- [ ] Run the focused test and verify GREEN.

### Task 3: `/admin` Operations Dashboard

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/page.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- `/admin` renders current club/season metrics and the action permission matrix.
- Page metadata is `noindex, nofollow`.
- Mobile uses one-column club summaries; desktop uses a compact two-column grid.

- [ ] Write page tests for the title, live metrics, permission labels, and noindex metadata.
- [ ] Write CSS regression tests for responsive layout and non-nested metric rows.
- [ ] Run focused tests and verify RED.
- [ ] Implement the server page and scoped admin styles.
- [ ] Run focused tests and verify GREEN.

### Task 4: Verification And Delivery

- [ ] Run `npm test` and confirm every test passes.
- [ ] Run `npm run lint` and confirm no lint errors.
- [ ] Run `npm run build` and confirm `/admin` is present in the route table.
- [ ] Inspect `/admin` at desktop and 412x915 mobile viewports and save screenshots.
- [ ] Run Supabase security/performance advisors; do not introduce a new database warning.
- [ ] Commit, push `main`, and wait for the production Vercel deployment to become Ready.
