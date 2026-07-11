# Monthly Settlement Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically run the existing monthly inactivity settlement at 00:10 KST on each month's first day while preserving manual recovery and per-club auditability.

**Architecture:** Supabase Cron calls a private timestamp-aware runner. Both the runner and the existing secret-guarded public RPC delegate to one private settlement function, keeping ranking behavior identical across automatic and manual execution.

**Tech Stack:** PostgreSQL 15, PL/pgSQL, Supabase Cron (`pg_cron`), Vitest, Supabase MCP

## Global Constraints

- Use TDD: run each new contract test red before adding migration behavior.
- Injured players receive the same monthly inactivity penalty as other non-left players.
- Preserve `/admin/monthly` as the manual preview and retry path.
- Do not add Vercel Cron, Edge Functions, `pg_net`, or new secrets.
- Run effective automation at 00:10 KST on the first day of each month.

---

### Task 1: Define The Migration Contract

**Files:**
- Create: `supabase/migrations/monthlySettlementAutomationMigrations.test.ts`
- Modify: `supabase/migrations/20260711072808_automate_monthly_inactivity_settlements.sql`

**Interfaces:**
- Consumes: existing `monthly_settlements`, `private.recalculate_season_rankings`, `admin_action_logs`, and `ranking_events`
- Produces: SQL contract for the shared core, automatic runner, and named Cron job

- [ ] **Step 1: Write failing extension and scheduling tests**

```ts
expect(sql).toContain("create extension if not exists pg_cron with schema pg_catalog");
expect(sql).toContain("'monthly-inactivity-settlement'");
expect(sql).toContain("'10 15 28-31 * *'");
expect(sql).toContain("private.run_monthly_inactivity_settlements()");
```

- [ ] **Step 2: Write failing shared-core and isolation tests**

```ts
expect(sql).toContain("create or replace function private.apply_monthly_inactivity_penalty");
expect(sql).toContain("return private.apply_monthly_inactivity_penalty(");
expect(sql).toContain("when unique_violation then");
expect(sql).toContain("when others then");
expect(sql).toContain("automatic_monthly_inactivity_penalty_failed");
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- supabase/migrations/monthlySettlementAutomationMigrations.test.ts`

Expected: FAIL because the generated migration is empty.

### Task 2: Extract One Authoritative Settlement Function

**Files:**
- Modify: `supabase/migrations/20260711072808_automate_monthly_inactivity_settlements.sql`
- Test: `supabase/migrations/monthlySettlementAutomationMigrations.test.ts`

**Interfaces:**
- Produces: `private.apply_monthly_inactivity_penalty(text, date, text) returns jsonb`
- Preserves: `public.apply_monthly_penalty_with_secret(text, date, text) returns jsonb`

- [ ] **Step 1: Move the existing validated settlement mutation into the private core**

The private function keeps the completed-month, season-boundary, membership,
confirmed-match, snapshot, uniqueness, ranking replay, and audit logic. It uses
`p_actor_type` to write `ranking_events.actor_type` and chooses the admin action
name with this exact expression:

```sql
case
  when p_actor_type = 'system'
    then 'automatic_monthly_inactivity_penalty_applied'
  else 'apply_monthly_inactivity_penalty'
end
```

- [ ] **Step 2: Replace the public RPC body with authentication plus delegation**

```sql
return private.apply_monthly_inactivity_penalty(
  p_club_slug,
  p_target_month,
  'admin'
);
```

- [ ] **Step 3: Revoke private execution and preserve public grants**

```sql
revoke all on function private.apply_monthly_inactivity_penalty(text, date, text)
from public, authenticated, anon;

revoke execute on function public.apply_monthly_penalty_with_secret(text, date, text)
from public, authenticated, anon;

grant execute on function public.apply_monthly_penalty_with_secret(text, date, text)
to anon, service_role;
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- supabase/migrations/monthlySettlementAutomationMigrations.test.ts`

Expected: remaining failures concern the runner and Cron registration only.

### Task 3: Add The Isolated Automatic Runner And Cron Job

**Files:**
- Modify: `supabase/migrations/20260711072808_automate_monthly_inactivity_settlements.sql`
- Test: `supabase/migrations/monthlySettlementAutomationMigrations.test.ts`

**Interfaces:**
- Produces: `private.run_monthly_inactivity_settlements(timestamptz default now()) returns jsonb`
- Schedules: named job `monthly-inactivity-settlement`

- [ ] **Step 1: Add the Seoul-date guard and target-month calculation**

```sql
v_seoul_timestamp := p_run_at at time zone 'Asia/Seoul';

if extract(day from v_seoul_timestamp) <> 1 then
  return jsonb_build_object('status', 'not_due');
end if;

v_target_month := (
  date_trunc('month', v_seoul_timestamp)::date - interval '1 month'
)::date;
```

- [ ] **Step 2: Iterate current in-season clubs with per-club subtransactions**

Each loop checks `monthly_settlements` first, calls the shared core with
`system`, catches `unique_violation` as skipped, catches all other exceptions as
failed, inserts the corresponding `admin_action_logs` record, and increments
structured success/skipped/failure counts.

- [ ] **Step 3: Register the named job**

```sql
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'monthly-inactivity-settlement',
  '10 15 28-31 * *',
  $cron$select private.run_monthly_inactivity_settlements();$cron$
);
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- supabase/migrations/monthlySettlementAutomationMigrations.test.ts`

Expected: PASS.

- [ ] **Step 5: Run all local checks**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass and both lint and build exit 0.

### Task 4: Apply And Verify Production Automation

**Files:**
- Verify: `supabase/migrations/20260711072808_automate_monthly_inactivity_settlements.sql`

**Interfaces:**
- Consumes: Supabase project `ltxoewsvzhumsudwrzdq`
- Produces: installed extension, scheduled job, tested runner, advisor report

- [ ] **Step 1: Apply the migration through Supabase MCP**

Apply the exact checked-in SQL with migration name
`automate_monthly_inactivity_settlements`.

- [ ] **Step 2: Verify job metadata**

```sql
select jobname, schedule, command, active
from cron.job
where jobname = 'monthly-inactivity-settlement';
```

Expected: one active row with `10 15 28-31 * *` and the private runner command.

- [ ] **Step 3: Verify a non-due invocation**

```sql
select private.run_monthly_inactivity_settlements(
  '2026-07-11 00:10:00+09'::timestamptz
);
```

Expected: JSON with status `not_due` and no settlement mutation.

- [ ] **Step 4: Verify idempotent due behavior inside a rollback transaction**

Use a completed test month, invoke the runner with the following month's first
day, inspect its structured counts and any audit rows, then `ROLLBACK` so the
verification does not persist ranking or settlement changes.

- [ ] **Step 5: Run Supabase advisors**

Run both security and performance advisors. Compare findings with the known
secret-guarded public RPC warnings and resolve any newly introduced issue.

### Task 5: Ship The Feature

**Files:**
- Review: all changed files

- [ ] **Step 1: Re-run fresh verification**

Run: `npm test && npm run lint && npm run build`

Expected: zero test failures, zero lint errors, and a successful production build.

- [ ] **Step 2: Commit, merge, and push**

Commit the feature branch with a value-focused message, fast-forward `main`,
push `origin/main`, and verify the remote deployment is healthy.
