# Supabase Admin Migration Design

Date: 2026-07-09

## Goal

Move Korea Tennis Ranking from Google Sheets-backed reads to a Supabase-backed product that supports:

- Public ranking pages for multiple clubs.
- Public match result submission without login.
- Admin pages at `/admin` for full data operations.
- Secret-key confirmation only for sensitive mutations.
- Rule automation for challenge range, rematch cooldown, ranking changes, injury protection, and monthly inactivity penalties.

This migration should preserve the current public UI contract as much as possible. Existing pages already expect `players`, `matches`, `summary`, and `detailsByPlayer`; the first implementation should keep that API shape and replace the data source beneath it.

## Product Model

There are two user modes.

Public users:

- View ranking pages.
- Open a modern `경기 결과 입력` action.
- Submit match results without login.
- Receive clear validation feedback when a match violates rules.

Admins:

- Visit `/admin` without login.
- Inspect players, matches, injuries, rankings, and monthly settlement previews.
- Enter a secret key only when performing sensitive data changes.

The admin secret is not a full login system. It is a lightweight guardrail around destructive or high-impact actions.

## Public Match Result Entry

Replace the old "방금 경기 끝났어?" language with a cleaner action:

- Primary label: `경기 결과 입력`
- Short mobile label if needed: `결과 입력`
- Suggested icon: `PencilLine` or `Plus`
- Placement: ranking summary action area, near refresh but visually separate.
- Mobile behavior: compact button below the summary stats.

Submission flow:

1. User chooses player 1 and player 2 from current active ranking.
2. User enters scores.
3. Client submits to a server API.
4. Server determines challenger/defender from current ranks.
5. Server validates all rules.
6. Server writes the match and ranking event in one transaction.
7. Server returns the updated ranking payload or a success response.

The form does not require `입력자`. The database still stores `source = public_form` for auditability.

## Sensitive Action Policy

No secret key required:

- View admin dashboard.
- View players.
- View matches.
- View injury records.
- View current rankings.
- View rule settings.
- Submit a normal match result through the public form.
- Preview monthly inactivity penalties.
- Preview ranking changes before saving.
- Export data.

Secret key required:

- Add a player.
- Rename a player.
- Delete or deactivate a player.
- Directly change current rank.
- Create, edit, delete, or void a match from admin.
- Register, edit, approve, or clear injury protection.
- Apply monthly inactivity penalties.
- Start, end, or reset a season.
- Import bulk data.
- Change rule settings such as challenge range, rematch cooldown, or penalty drop.

Default treatment for borderline actions:

- Editing player notes only does not require the secret if the note is purely informational.
- Marking a player as temporarily inactive requires the secret because it can affect challenge eligibility and monthly settlement.
- Restoring a voided match requires the secret because it changes match history.
- Recalculating an entire season from initial rankings and match history requires the secret because it can rewrite many ranks at once.

## Supabase Schema

### `clubs`

Stores each public ranking space.

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `title text not null`
- `organization text not null`
- `subtitle text not null`
- `logo_path text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Examples: `seoultech`, `petc`.

### `seasons`

Stores club-specific seasons.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `name text not null`
- `starts_on date`
- `ends_on date`
- `is_current boolean not null default false`
- `created_at timestamptz not null default now()`

Only one current season should exist per club.

### `players`

Stores a person independent of club and season.

- `id uuid primary key`
- `name text not null`
- `display_name text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `season_players`

Stores a player's participation in a specific club season.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `season_id uuid references seasons(id)`
- `player_id uuid references players(id)`
- `initial_rank integer not null`
- `current_rank integer not null`
- `note text not null default ''`
- `status text not null default 'active'`
- `joined_at timestamptz not null default now()`
- `left_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended `status` values:

- `active`
- `injured`
- `inactive`
- `left`

### `matches`

Stores all match facts. Ranking stats are computed from this table.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `season_id uuid references seasons(id)`
- `played_on date not null`
- `challenger_player_id uuid references players(id)`
- `defender_player_id uuid references players(id)`
- `challenger_rank_before integer not null`
- `defender_rank_before integer not null`
- `winner_player_id uuid references players(id)`
- `loser_player_id uuid references players(id)`
- `winner_score integer not null`
- `loser_score integer not null`
- `defense_result text not null`
- `source text not null default 'public_form'`
- `status text not null default 'confirmed'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended `source` values:

- `public_form`
- `admin`
- `import`

Recommended `status` values:

- `confirmed`
- `voided`

### `injury_periods`

Stores injury protection windows.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `season_id uuid references seasons(id)`
- `player_id uuid references players(id)`
- `starts_on date not null`
- `ends_on date`
- `reason text not null default ''`
- `approved boolean not null default true`
- `exemption_month text`
- `used_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The monthly penalty job should count exemptions from this table.

### `rule_configs`

Stores club and season-specific rule values.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `season_id uuid references seasons(id)`
- `challenge_range integer not null default 4`
- `rematch_cooldown_days integer not null default 14`
- `inactivity_penalty_drop integer not null default 2`
- `injury_exemption_limit integer not null default 2`
- `injury_notice_deadline_days_before_month_end integer not null default 7`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `ranking_events`

Stores a durable audit log for ranking-changing operations.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `season_id uuid references seasons(id)`
- `event_type text not null`
- `actor_type text not null default 'system'`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Example `event_type` values:

- `match_recorded`
- `monthly_penalty_applied`
- `player_added`
- `player_deactivated`
- `admin_rank_adjusted`
- `injury_registered`
- `season_started`
- `season_ended`

### `admin_action_logs`

Stores sensitive admin mutations.

- `id uuid primary key`
- `club_id uuid references clubs(id)`
- `action text not null`
- `target_table text`
- `target_id uuid`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

No user account is required. This table exists to make changes traceable.

## Rule Automation

### Challenge range

Default rule: lower-ranked player can challenge up to four places above.

If injury-protected players exist between the challenger and defender, the server should treat protected players as skipped for challenge eligibility. This allows the lower-ranked player to challenge higher than the usual numeric limit when injury protection blocks the path.

### Rematch cooldown

Default rule: the same two players cannot play a ranking match again for 14 days.

This applies regardless of who challenged and regardless of whether rankings changed after the previous match.

### Score validation

The server should reject invalid scores.

- Winner score must be 6.
- Loser score must be between 0 and 5.
- Winner and loser cannot have the same score.
- Both selected players must be active season players.

### Challenger and defender detection

The lower-ranked selected player is the challenger.
The higher-ranked selected player is the defender.

This keeps the public form simple: users only choose two players and scores.

### Ranking movement

If the challenger beats the defender:

- Challenger takes the defender's rank.
- Everyone from the defender's previous rank down to the challenger's previous rank moves down one place.
- Defender also moves down within that chain.

If the defender wins:

- Ranking remains unchanged.

### Defense result

The server derives this value.

- Defender wins: `방어 성공`
- Challenger wins: `방어 실패`

### Monthly inactivity penalty

At month settlement:

1. Find active season players with zero confirmed matches during the target month.
2. Exclude approved injury-protected players with remaining exemptions.
3. Drop each penalized player by the configured number of ranks.
4. Apply all penalties as one monthly batch so simultaneous drops are deterministic.
5. Write a `ranking_events` record.

First implementation should expose this as `/admin/monthly`:

- Preview penalty targets without secret key.
- Apply penalty with secret key.

Cron automation can be added later after the manual flow is trusted.

### Injury protection

The admin can register injury protection.

Rules:

- Injury request must be made before the configured monthly deadline.
- Default deadline is seven days before the end of the month.
- A player can avoid inactivity penalty up to the configured exemption limit.

## API Design

Public APIs:

- `GET /api/clubs/[club]/ranking`
- `POST /api/clubs/[club]/matches`

Admin APIs:

- `GET /api/admin/[club]/players`
- `POST /api/admin/[club]/players`
- `PATCH /api/admin/[club]/players/[playerId]`
- `DELETE /api/admin/[club]/players/[playerId]`
- `GET /api/admin/[club]/matches`
- `PATCH /api/admin/[club]/matches/[matchId]`
- `DELETE /api/admin/[club]/matches/[matchId]`
- `GET /api/admin/[club]/monthly/preview`
- `POST /api/admin/[club]/monthly/apply`
- `GET /api/admin/[club]/injuries`
- `POST /api/admin/[club]/injuries`
- `PATCH /api/admin/[club]/injuries/[injuryId]`
- `DELETE /api/admin/[club]/injuries/[injuryId]`
- `GET /api/admin/[club]/settings`
- `PATCH /api/admin/[club]/settings`

Sensitive admin APIs require the admin secret in a request header:

- `x-admin-secret: <secret>`

The secret must only live in server-side environment variables and must never be exposed as `NEXT_PUBLIC_*`.

## Frontend Pages

Public:

- `/`
- `/[club]`
- `/[club]/players/[player]`
- `/[club]/matches`
- `/[club]/matches/new` or a ranking-page modal/bottom-sheet

Admin:

- `/admin`
- `/admin/[club]`
- `/admin/[club]/players`
- `/admin/[club]/matches`
- `/admin/[club]/injuries`
- `/admin/[club]/monthly`
- `/admin/[club]/settings`

The first admin implementation can be plain and utilitarian. It should optimize for correctness and speed of operation, not visual drama.

## Migration Strategy

1. Keep Google Sheets code working.
2. Create Supabase schema.
3. Add repository functions that return the same TypeScript shapes as current Sheets readers.
4. Import existing Sheets data into Supabase.
5. Compare Supabase ranking output with Sheets ranking output in tests.
6. Switch public API reads to Supabase behind a feature flag.
7. Add public match submission.
8. Add admin pages and admin mutations.
9. Retire Google Sheets as the source of truth after verification.

## Testing Strategy

Follow TDD for every behavior change.

Core unit tests:

- Challenge range validation.
- Injury-skipped challenge range validation.
- Rematch cooldown validation.
- Score validation.
- Defender win keeps ranking.
- Challenger win moves rank chain.
- Monthly inactivity target detection.
- Injury exemption application.
- Secret-key requirement for sensitive admin actions.

Integration tests:

- Public match submit API rejects invalid matches.
- Public match submit API records valid matches.
- Ranking API returns the current client contract.
- Admin preview does not require secret.
- Admin apply/delete/update requires secret.

## First Implementation Slice

The first implementation should not attempt the entire migration at once.

Recommended first slice:

1. Add domain models and rule engine tests.
2. Implement pure TypeScript ranking rule functions.
3. Create Supabase schema.
4. Add Supabase repository read functions.
5. Import current Seoultech data.
6. Keep public ranking output identical.

After that:

1. Add `경기 결과 입력`.
2. Add public match submission API.
3. Add admin pages.
4. Add monthly settlement.
