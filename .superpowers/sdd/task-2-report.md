# Task 2 Report: Calculate Club Rankings

## Implementation Summary

Implemented `calculateNationalRankings(dataset)` and the supporting Task 2
contracts.

- Scores only verified results attached to verified editions.
- Fails closed with source-qualified errors for verified results that reference
  an unknown edition, tournament, or club.
- Keeps the best team contribution for each club/gender/tournament/year scoring
  unit.
- Creates independent men's and women's rows plus combined rows for every
  configured club, including a club with no contribution for one gender.
- Applies the approved tie-break order: total points, latest-edition points,
  largest contribution, championships, runner-ups, then Korean display name.

## RED

Command:

```bash
npm test -- lib/nationalRanking/calculate.test.ts
```

Output:

```text
Exit code: 1

> nextjs@0.1.0 test
> vitest run lib/nationalRanking/calculate.test.ts

FAIL  lib/nationalRanking/calculate.test.ts
Error: Failed to resolve import "@/lib/nationalRanking/calculate" from
"lib/nationalRanking/calculate.test.ts". Does the file exist?

Test Files  1 failed (1)
Tests  no tests
```

The behavioral suite was written before `calculate.ts` existed, and failed for
the expected missing-module reason.

## Focused GREEN

Command:

```bash
npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts
```

Output:

```text
Exit code: 0

Test Files  2 passed (2)
Tests  10 passed (10)
Duration  777ms
```

## Full Suite

Command:

```bash
npm test
```

Output:

```text
Exit code: 0

Test Files  52 passed (52)
Tests  257 passed (257)
Duration  7.53s
```

The run emitted pre-existing Node warnings that `--localstorage-file` was
provided without a valid path.

Additional verification:

```text
npm run lint: exit code 0
npm run build: exit code 0
```

## Files Changed

- `lib/nationalRanking/types.ts`
- `lib/nationalRanking/calculate.ts`
- `lib/nationalRanking/calculate.test.ts`

## Commit

- `1b24a64 feat: calculate national club rankings`

## Self-Review

No Task 2 findings. The review confirmed the declared contracts, verified-only
join behavior, source-qualified failures, best-team grouping key, combined-row
aggregation, per-competition latest-edition metrics, tie-break ordering, and
rank assignment. `git diff --check` and ESLint passed.

## Concerns

`npx tsc --noEmit` remains nonzero because of pre-existing unrelated fixture
type errors in club-page tests: missing `ClubConfig.currentSeasonName` and
`currentSeasonStartsOn`, plus a `latestResult` string that is not a
`MatchResult`. No diagnostics reference the Task 2 files, and the Next.js
production build succeeds.

## Review Fix Pass

### RED

Command:

```bash
npm test -- lib/nationalRanking/calculate.test.ts
```

Output:

```text
Exit code: 1

Test Files  1 failed (1)
Tests  2 failed | 6 passed (8)

FAIL  lib/nationalRanking/calculate.test.ts > calculateNationalRankings > validates tournament and club joins before excluding an unverified edition
AssertionError: expected [Function] to throw an error

FAIL  lib/nationalRanking/calculate.test.ts > calculateNationalRankings > adds gender totals directly for combined rows
AssertionError: expected 10000000000000000 to be 10000000000000002 // Object.is equality
```

### Focused GREEN

Command:

```bash
npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts
```

Output:

```text
Exit code: 0

Test Files  2 passed (2)
Tests  12 passed (12)
Duration  572ms
```

### Full Suite

Command:

```bash
npm test
```

Output:

```text
Exit code: 0

Test Files  52 passed (52)
Tests  259 passed (259)
Duration  8.33s

Warnings: Node emitted the pre-existing `--localstorage-file` invalid-path warning.
```

### Files Changed

- `lib/nationalRanking/calculate.ts`
- `lib/nationalRanking/calculate.test.ts`
- `.superpowers/sdd/task-2-report.md`

### Commit

- `2378cdc fix: validate national ranking joins`

### Self-Review

No new findings. Verified results now validate their edition, tournament, and
club joins before an unverified edition is excluded. Combined rows use direct
men/women addition for total points, latest-edition points, championships, and
runner-ups; their maximum and contribution list preserve their non-additive
meanings. The best-team scoring key remains club/gender/tournament/year, as
defined by the Task 2 brief.

### Captured Console Output

RED:

```text
> nextjs@0.1.0 test
> vitest run lib/nationalRanking/calculate.test.ts

 RUN  v4.1.10 /Users/parkjinhong/Documents/Codex/2026-06-28/new-chat/.worktrees/national-club-ranking

❯ lib/nationalRanking/calculate.test.ts (8 tests | 2 failed) 15ms
  × validates tournament and club joins before excluding an unverified edition 3ms
  × adds gender totals directly for combined rows 1ms

FAIL  lib/nationalRanking/calculate.test.ts > calculateNationalRankings > validates tournament and club joins before excluding an unverified edition
AssertionError: expected [Function] to throw an error

FAIL  lib/nationalRanking/calculate.test.ts > calculateNationalRankings > adds gender totals directly for combined rows
AssertionError: expected 10000000000000000 to be 10000000000000002 // Object.is equality

Test Files  1 failed (1)
Tests  2 failed | 6 passed (8)
Start at  16:42:54
Duration  670ms (transform 30ms, setup 0ms, import 40ms, tests 15ms, environment 489ms)
```

Focused GREEN:

```text
> nextjs@0.1.0 test
> vitest run lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts

 RUN  v4.1.10 /Users/parkjinhong/Documents/Codex/2026-06-28/new-chat/.worktrees/national-club-ranking

Test Files  2 passed (2)
Tests  12 passed (12)
Start at  16:43:25
Duration  572ms (transform 53ms, setup 0ms, import 87ms, tests 15ms, environment 692ms)
```

Full suite:

```text
> nextjs@0.1.0 test
> vitest run

 RUN  v4.1.10 /Users/parkjinhong/Documents/Codex/2026-06-28/new-chat/.worktrees/national-club-ranking

(node:89370) Warning: `--localstorage-file` was provided without a valid path
(node:89368) Warning: `--localstorage-file` was provided without a valid path
(node:89377) Warning: `--localstorage-file` was provided without a valid path
(node:89386) Warning: `--localstorage-file` was provided without a valid path
(node:89413) Warning: `--localstorage-file` was provided without a valid path
(node:89552) Warning: `--localstorage-file` was provided without a valid path
(node:89554) Warning: `--localstorage-file` was provided without a valid path
(node:89588) Warning: `--localstorage-file` was provided without a valid path
(node:89591) Warning: `--localstorage-file` was provided without a valid path
(node:89628) Warning: `--localstorage-file` was provided without a valid path
(node:89631) Warning: `--localstorage-file` was provided without a valid path

Test Files  52 passed (52)
Tests  259 passed (259)
Start at  16:43:36
Duration  8.33s (transform 1.99s, setup 0ms, import 7.18s, tests 3.75s, environment 31.83s)
```
