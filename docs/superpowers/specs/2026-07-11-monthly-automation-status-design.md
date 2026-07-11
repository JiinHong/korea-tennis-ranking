# Monthly Automation Status Design

## Objective

Show the monthly settlement automation's next effective execution time and the
latest per-club outcome on `/admin/monthly`. Keep raw database errors private,
preserve the existing manual settlement recovery flow, and add no new ranking
rules or administrator secret.

## Selected Data Access Approach

Create a sanitized public read model populated from automatic settlement audit
logs by a database trigger.

Alternatives rejected:

- A public `SECURITY DEFINER` read RPC would add another anonymously executable
  privileged function and another Supabase advisor warning.
- A server-side service-role client would require a new production secret and
  give the application broader database privileges than this read needs.
- Reading `admin_action_logs` directly is impossible through the existing
  publishable-key client and would expose raw internal errors if opened.

## Sanitized Read Model

Add `public.monthly_settlement_automation_runs` with one row per automatic
club outcome:

- source `admin_action_log_id`
- `club_id` and `season_id`
- settled `target_month`
- status: `succeeded`, `skipped`, or `failed`
- optional `settlement_id`
- optional non-secret `error_code`
- fixed Korean `public_message`
- `executed_at`

The table enables RLS and grants `anon` only `SELECT`. No public role receives
write access.

An `AFTER INSERT` trigger on `admin_action_logs` copies only these actions:

- `automatic_monthly_inactivity_penalty_applied`
- `automatic_monthly_inactivity_penalty_skipped`
- `automatic_monthly_inactivity_penalty_failed`

The trigger never copies `payload.errorMessage`. The fixed public failure text
directs an administrator to use the existing manual preview. Existing matching
logs are backfilled idempotently by the migration.

## Server Data Shape

Add a focused monthly automation status repository that returns:

```ts
type AdminMonthlyAutomationStatus = {
  nextRunAt: string;
  latestByClubId: Record<string, AdminMonthlyAutomationRun>;
};
```

The repository reads the sanitized table ordered by `executed_at` descending
and keeps the first row for each club. The next effective run is calculated in
application code from the fixed contract: the next first day of a month at
00:10 Asia/Seoul. A first-day time before 00:10 points to the same day; all
other times point to the following month.

## Administrator Interface

The existing club tabs remain authoritative. Directly below them, add a quiet
automation status band containing:

- next automatic settlement time
- latest run time, or `아직 실행 기록 없음`
- latest target month, when present
- plain-text status with a small colored dot
- safe failure or skip message

Status labels:

- no history: `실행 대기`
- succeeded: `정상 완료`
- skipped: `건너뜀`
- failed: `확인 필요`

On failure, show that the administrator should review the preview below and
run the existing `정산 적용` action. Do not add a second mutation button.

## Security

- Raw SQL messages remain only in `admin_action_logs`.
- The public table contains a fixed message and optional SQLSTATE-like code.
- The trigger function is private and execution is revoked from `PUBLIC`,
  `anon`, and `authenticated`.
- The public table has RLS and only a read policy for `anon`.
- Existing manual mutation still requires the administrator secret.

## Testing

- Migration contract tests verify RLS, read-only grants, trigger filtering,
  raw-error exclusion, and backfill idempotency.
- Repository tests verify latest-per-club reduction and KST next-run edges.
- Page tests verify both data sources are loaded.
- Component tests verify empty, success, skipped, and failure states and manual
  recovery guidance.
- Run full tests, lint, build, Supabase rollback SQL, migration application,
  advisors, and responsive browser screenshots before push.

## Out Of Scope

- Changing Cron timing or settlement behavior
- Displaying raw database error messages
- Adding notification delivery
- Adding login or a service-role key
- Adding new ranking rules
- Creating another settlement mutation action
