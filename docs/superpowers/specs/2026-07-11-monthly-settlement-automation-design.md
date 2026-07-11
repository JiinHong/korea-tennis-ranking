# Monthly Settlement Automation Design

## Objective

Automatically apply the existing monthly inactivity settlement at 00:10 KST
on the first day of every month. The automation must use the exact same
settlement logic as the administrator's manual action, process clubs
independently, preserve the manual retry path, and leave an audit trail.

## Selected Approach

Use Supabase Cron (`pg_cron`) to execute a private Postgres function directly.
The database is already authoritative for ranking changes, and a direct SQL
job avoids an HTTP endpoint, an Edge Function, an additional secret, and a
network failure boundary.

Alternatives considered:

- Vercel Cron calling an API route would add deployment and HTTP authentication
  dependencies to a database-only operation.
- Supabase Cron calling an Edge Function through `pg_net` would add both a
  network hop and Vault-managed credentials without providing useful behavior
  for this transaction.

## Schedule And Time Zone

The production database uses UTC. Register a named Cron job with
`10 15 28-31 * *`, which runs at 15:10 UTC on the possible final days of a
month. The runner converts its execution timestamp to `Asia/Seoul` and performs
work only when the resulting local date is the first day of a month. This
produces one effective run at 00:10 KST while safely handling 28-, 29-, 30-,
and 31-day months.

The runner calculates the target month as the calendar month immediately
before the Seoul execution date. For example, the 2026-08-01 00:10 KST run
settles July 2026.

## Shared Settlement Core

Extract the existing mutation body into a private function:

```sql
private.apply_monthly_inactivity_penalty(
  p_club_slug text,
  p_target_month date,
  p_actor_type text
) returns jsonb
```

This function remains responsible for all existing rules:

- target month must be a completed calendar month within the current season
- players with `status <> 'left'` who joined before month end are eligible
- injured players remain eligible for the inactivity penalty
- only confirmed matches count as participation
- players with zero matches drop by the configured amount, currently two
- rankings are replayed chronologically after inserting the settlement
- one settlement is allowed per season and month
- match counts and before/after ranking snapshots are stored
- ranking and administrator audit events are written

The existing public function continues to validate the administrator secret,
then calls the private core with actor type `admin`. Its public signature and
manual administrator behavior do not change. The Cron runner calls the same
private core with actor type `system`.

No private function is executable by `PUBLIC`, `anon`, or `authenticated`.

## Automatic Runner

Add a private runner with an injectable timestamp for deterministic testing:

```sql
private.run_monthly_inactivity_settlements(
  p_run_at timestamptz default now()
) returns jsonb
```

The runner:

1. Converts `p_run_at` to Seoul local time.
2. Returns `not_due` without mutations unless the local day is 1.
3. Selects active clubs with a current season containing the target month.
4. Skips a club if that season and month already have a settlement.
5. Calls the shared core for each remaining club.
6. Catches errors inside each club iteration so another club can still settle.
7. Returns counts for succeeded, skipped, and failed clubs.

## Audit And Failure Handling

`cron.job_run_details` records the database job's execution status. Application
level outcomes are also written to the existing `admin_action_logs` table:

- `automatic_monthly_inactivity_penalty_skipped` for an existing settlement
- `automatic_monthly_inactivity_penalty_failed` with SQLSTATE and error message
  when a club fails
- successful application is recorded by the shared core as
  `automatic_monthly_inactivity_penalty_applied`

A failure for one club is contained by a PL/pgSQL exception block and does not
roll back successful settlements for other clubs. The existing `/admin/monthly`
screen remains the recovery path: administrators can preview and manually
apply any month that was not successfully settled.

## Idempotency And Concurrency

- `monthly_settlements (season_id, target_month)` remains the final uniqueness
  boundary.
- The existing season advisory transaction lock serializes ranking mutations.
- The runner checks for an existing settlement before calling the core.
- A concurrent unique violation is treated as a skipped automatic attempt.
- Re-running the Cron job cannot apply a second penalty for the same month.

## Security

- Install `pg_cron` in `pg_catalog` using Supabase's documented SQL setup.
- Schedule the job as the migration owner (`postgres`).
- Keep the automatic runner and shared core in the unexposed `private` schema.
- Revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Do not store or pass the administrator secret to Cron.
- Preserve the secret check on the existing public manual RPC.

## Testing And Verification

- Migration contract tests must fail before implementation and verify the
  extension, schedule, local-date guard, shared core, per-club error isolation,
  audit actions, idempotency, and privilege revocations.
- Apply the migration to Supabase only after local tests pass.
- Verify the named job exists with the expected schedule and command.
- Invoke the private runner with a non-first-day timestamp and verify `not_due`.
- Exercise a due timestamp inside a transaction and roll back any resulting
  settlement changes after inspecting its structured result.
- Run the full test suite, lint, build, and Supabase security/performance
  advisors before pushing.

## Out Of Scope

- Changing the two-rank inactivity rule
- Exempting injured players
- Automatically ending injuries
- Changing match submission or challenge eligibility
- Adding a new administrator screen
- Email, KakaoTalk, or push notifications
- Vercel Cron, Edge Functions, or `pg_net`
