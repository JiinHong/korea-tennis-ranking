# Injury Status Simplification Design

## Objective

Represent injury as a player's current season status only. Injury has no start
date, end date, approval period, or inactivity-penalty exemption. An injured
player remains injured until the player reports recovery and an administrator
changes the status back to active.

This design supersedes the injury-period and injury-exemption portions of the
earlier Supabase migration design. No other ranking rule changes are included.

## Authoritative Rules

- Injury status never exempts a player from the monthly inactivity penalty.
  The later settlement applies the same participation criteria to active and
  injured players. Treatment of `inactive` and `left` remains outside this
  change.
- Injury has no predefined duration and may continue indefinitely.
- Only an administrator changes a player between `active` and `injured`.
- An injured player cannot submit or participate in a ranking match.
- When the injury is over, the player must report recovery to an administrator
  before entering a match result.
- Injured players are skipped when counting the four eligible challenge places.

## Data Model

`season_players.status` is the only source of truth for injury state.

- `active`: the player may participate in matches.
- `injured`: the player cannot participate in matches and is skipped in the
  challenge-distance calculation.
- Existing `inactive` and `left` behavior is unchanged.

The following unused structures must be removed:

- `public.injury_periods`
- `rule_configs.injury_exemption_limit`
- `rule_configs.injury_notice_deadline_days_before_month_end`
- Application types, seed data, policies, and dashboard queries that depend on
  those structures

The production `injury_periods` table currently contains no rows, so removing it
does not discard an existing injury history.

## Administrator Flow

The existing `/admin/players` screen remains the management surface.

1. The administrator opens a player's status action.
2. Setting the status to `injured` immediately blocks match participation.
3. The status remains `injured` without an automatic expiration.
4. After the player reports recovery, the administrator sets the status to
   `active`.
5. Both changes continue to require the administrator secret and write the
   existing ranking and administrator audit events.

No separate injury form, injury dates, injury reason, approval workflow, or
automatic recovery job will be added.

## Public Match Flow

The match-entry dialog continues to list only active players. It also displays
this guidance:

> 부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요.

The database transaction remains authoritative. A direct or stale API request
that includes an injured player is rejected with the same message. Other
non-active statuses retain a generic non-participation error.

The existing challenge-distance query already counts only active players. This
preserves the stated rule that an injured player between two ranks is skipped,
allowing the challenger to reach one place higher for each skipped injured
player.

## Administrator Dashboard

The dashboard must derive its injury count from
`season_players.status = 'injured'`.

- Rename the `보호 기록` metric to `부상 선수`.
- Remove injury-period queries and injury-exemption rule values.
- Keep the existing roster status summary.

## Monthly Penalty Boundary

This change does not implement monthly settlement. It establishes one rule for
that later feature: injured players must not be excluded from inactivity-penalty
targets. The later settlement design must not introduce an injury exemption.

## Error Handling

- Injured player in a match: return HTTP 400 with the recovery-report guidance.
- Player not active for another reason: retain the existing generic validation
  error.
- Schema migration: use `drop ... if exists` so already-clean environments can
  apply it safely.

## Testing

- Migration contract tests verify removal of the obsolete table and columns.
- Admin repository tests verify injury counts come from player statuses and no
  injury-period query is made.
- Match transaction tests verify the injured-player-specific error.
- Match dialog tests verify the recovery-report guidance is visible.
- Existing challenge-range tests continue to verify that injured players are
  skipped.
- Full tests, lint, build, Supabase advisors, and production smoke tests run
  before deployment.

## Out Of Scope

- Injury dates or history
- Injury reasons or files
- Injury approval or rejection
- Injury-related inactivity exemptions
- Automatic injury expiration
- Automatic monthly settlement
- Any ranking rule not explicitly listed above
