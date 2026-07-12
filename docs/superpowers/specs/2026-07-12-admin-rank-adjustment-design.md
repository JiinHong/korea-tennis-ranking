# Admin Rank Adjustment Design

Date: 2026-07-12

## Goal

Allow an administrator to correct a current-season player's rank from
`/admin/players` while preserving a complete, unique ranking and leaving match
history and initial ranks unchanged.

## Scope

- Add a `순위 변경` action to each eligible current-season player row.
- Show the exact cascading rank movement before saving.
- Require the existing admin secret only when the change is applied.
- Apply the selected player's move and every affected player's shift in one
  Postgres transaction.
- Record the correction in both `ranking_events` and `admin_action_logs`.
- Refresh the admin roster and public ranking after success.

This feature does not edit `initial_rank`, rewrite matches, add a new ranking
rule, or provide arbitrary drag-and-drop ordering. Players whose status is
`left` cannot be moved.

## Rank Movement

The target rank must be between `1` and the number of current-season players
whose status is not `left`.

- Moving from rank 5 to rank 2 places the selected player at rank 2 and moves
  the previous ranks 2 through 4 down one place.
- Moving from rank 2 to rank 5 places the selected player at rank 5 and moves
  the previous ranks 3 through 5 up one place.
- Selecting the existing rank is rejected because it changes nothing.
- `left` players remain after the ranked roster and are never part of the
  target range.

The UI preview and database function independently implement this contract.
The database remains authoritative.

## Approaches Considered

### Extend the existing guarded player RPC (selected)

Replace `manage_admin_player_with_secret` with a backward-compatible signature
that adds `p_target_rank integer default null`, then add the `rank` action. The
function locks the current season roster, validates the target, temporarily
offsets ranks to avoid the `(season_id, current_rank)` unique constraint,
applies the move, and writes audit rows.

The default parameter keeps existing six-parameter callers working during a
rolling deployment. Reusing the existing guarded endpoint also avoids adding a
fifth anonymous `security definer` function to the Supabase security-advisor
baseline.

### Separate guarded rank RPC

A focused `adjust_admin_player_rank_with_secret` function would limit changes
to the existing player RPC, but it would expand the externally callable
privileged surface and add another intentional security-advisor warning. This
approach is rejected.

### Multiple server-side updates

Issuing several Supabase updates from Next.js would be easier to read but would
not be atomic and could temporarily violate rank uniqueness. This approach is
rejected.

## Data Flow

1. The admin opens `순위 변경` for a player.
2. The client selects a target from the current non-left roster and builds a
   pure preview from the already loaded roster.
3. The client sends `operation`, `seasonPlayerId`, `targetRank`, and
   `adminSecret` to the existing admin player route.
4. The route validates the payload and calls the server-only command adapter.
5. The adapter invokes `manage_admin_player_with_secret` with action `rank` and
   the target-rank parameter.
6. Postgres verifies the secret, locks the roster, applies the complete rank
   shift, and writes `admin_rank_adjusted` and `change_rank` audit records.
7. The UI discards the secret, closes the dialog, and refreshes server data.

## Database Safety

The existing RPC continues to use `security definer` with an empty `search_path`
and schema-qualified relations. Execution is revoked from `public` and
`authenticated`; it is granted only to `anon` and `service_role` because the
current server client uses the publishable key and the function performs its
own constant-time password hash comparison. No additional privileged function
is exposed.

All current-season rows are locked before reading or writing ranks. Every
validation failure raises a known SQLSTATE and rolls back the entire function.
The response includes the selected player's old and new ranks plus the final
ordered rank changes for verification.

## Admin Interface

The existing table gains a compact `순위 변경` text action beside `이름 수정`.
The dialog contains:

- player name and current rank;
- target-rank select;
- a plain preview list showing only affected players and `기존 → 변경` ranks;
- admin secret field;
- one `순위 적용` command button.

The preview is informational and requires no secret. The submit button remains
disabled for the current rank, invalid targets, an empty secret, or an active
request. Errors stay inside the dialog and the secret is cleared after a failed
request.

## Error Handling

- Unknown club or malformed input: HTTP 400/404 before calling Supabase.
- Wrong secret: HTTP 403 with the existing Korean secret error.
- Missing player, left player, out-of-range target, or unchanged rank: HTTP 400
  with a safe validation message from the RPC.
- Unexpected database or response-shape failure: generic HTTP 500 without
  exposing database details.

## Testing

- Pure preview tests cover upward movement, downward movement, unchanged rank,
  and exclusion of left players.
- Command-adapter tests cover RPC parameters, typed response validation,
  forbidden errors, validation errors, and hidden unexpected errors.
- Route tests cover a valid rank mutation and every malformed input boundary.
- Migration tests assert secret validation, roster locking, unique-safe rank
  movement, left-player rejection, audit inserts, and function grants.
- Component tests cover preview rendering, request payload, secret lifecycle,
  left-player action suppression, and server errors.
- Final verification runs the full test suite, lint, production build, mobile
  and desktop browser checks, Supabase advisors, and an operational database
  query after migration.
