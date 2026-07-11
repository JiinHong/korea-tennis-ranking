# Monthly Automation Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show safe, useful monthly automation status on `/admin/monthly` without exposing private audit details or adding a privileged application secret.

**Architecture:** A database trigger projects automatic settlement audit actions into an anon-readable sanitized table. A focused server repository derives the latest run per club and the next KST run time, and the existing monthly manager renders it above the preview.

**Tech Stack:** PostgreSQL 15, Supabase RLS, Next.js 16, React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Use TDD and observe each new test fail before implementation.
- Expose no raw `admin_action_logs.payload.errorMessage` value.
- Add no service-role key, login, new secret, or new ranking rule.
- Preserve the existing manual monthly settlement action as the only recovery mutation.
- Next automatic settlement means 00:10 Asia/Seoul on the next effective first day.

---

### Task 1: Add A Sanitized Automation Run Projection

**Files:**
- Create: `supabase/migrations/monthlyAutomationStatusMigrations.test.ts`
- Modify: `supabase/migrations/20260711111712_expose_monthly_automation_status.sql`

**Interfaces:**
- Consumes: automatic actions inserted into `public.admin_action_logs`
- Produces: anon-readable `public.monthly_settlement_automation_runs`

- [ ] Write contract tests for the table, status check, RLS, anon read-only grant, filtered trigger, fixed public messages, raw-error exclusion, and idempotent backfill.
- [ ] Run `npm test -- supabase/migrations/monthlyAutomationStatusMigrations.test.ts` and verify RED against the empty migration.
- [ ] Implement the table, private trigger function, trigger, policies, grants, index, and backfill.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Build The Automation Status Repository

**Files:**
- Create: `lib/supabaseMonthlyAutomationStatus.ts`
- Create: `lib/supabaseMonthlyAutomationStatus.test.ts`

**Interfaces:**
- Produces: `getAdminMonthlyAutomationStatus(adapter?, now?)`
- Produces: `AdminMonthlyAutomationStatus` and `AdminMonthlyAutomationRun`

- [ ] Write failing tests for no history, latest row per club, all three statuses, first-day-before-00:10, first-day-after-00:10, and month/year rollover.
- [ ] Run the focused repository test and verify RED.
- [ ] Implement the pure next-run calculation, latest-per-club reduction, and Supabase adapter query.
- [ ] Re-run the focused test and verify GREEN.

### Task 3: Load And Render Status On The Monthly Page

**Files:**
- Modify: `app/admin/monthly/page.tsx`
- Modify: `app/admin/monthly/page.test.tsx`
- Modify: `app/admin/monthly/AdminMonthlyManager.tsx`
- Modify: `app/admin/monthly/AdminMonthlyManager.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `AdminMonthlyAutomationStatus`
- Preserves: existing `clubs` prop behavior and manual settlement dialog

- [ ] Update the page test to require parallel loading and prop forwarding, then verify RED.
- [ ] Update component tests for empty, success, skipped, and failed status plus recovery guidance, then verify RED.
- [ ] Load both server data sources with `Promise.all` and pass status to the manager.
- [ ] Render an unframed automation band below club controls using plain status text, a small dot, timestamps, target month, and safe guidance.
- [ ] Add restrained responsive CSS and verify focused tests GREEN.

### Task 4: Apply, Inspect, And Ship

**Files:**
- Verify all changed files

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Execute the migration inside `BEGIN ... ROLLBACK` and verify the trigger projection with synthetic audit rows.
- [ ] Apply the checked-in migration through Supabase MCP.
- [ ] Verify RLS/grants, repository production reads, and Supabase advisors.
- [ ] Start the local server and inspect `/admin/monthly` at desktop and mobile widths with browser screenshots.
- [ ] Fix any visual or functional defect and re-run affected tests.
- [ ] Commit, fast-forward `main`, push GitHub, and verify the production route.
