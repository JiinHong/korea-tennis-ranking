# Task 7 Report: Generate an idempotent source-and-snapshot seed

## Scope

- Added seed plan and seed SQL generation for national ranking source tables, formula versions, snapshots, and ranking rows.
- Added the CLI at `scripts/build-national-ranking-seed-sql.ts`.
- Added the `seed:national:sql` package script using `node --import tsx` so npm does not invoke the sandbox-blocked `tsx` IPC CLI.
- Carried forward the schema/view audit fields needed by the seed output: `effective_on` and `calculated_at`.

## RED Evidence

- Reconstructed original Task 7 RED from the brief: `npm test -- lib/nationalRanking/seedPlan.test.ts` failed before `lib/nationalRanking/seedPlan.ts` existed.
- Reconstructed original SQL generator RED from the brief: seed SQL tests failed before `lib/nationalRanking/seedSql.ts` existed.
- Fresh RED before final fix: `npm run seed:national:sql -- --out /tmp/national-ranking-seed.sql` failed with `Error: listen EPERM ... /tsx-501/...pipe`, proving the package script could not use the `tsx` CLI in this sandbox.
- Fresh RED package regression: after updating the test expectation, `npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts` failed because `seed:national:sql` was still `tsx scripts/build-national-ranking-seed-sql.ts` instead of `node --import tsx scripts/build-national-ranking-seed-sql.ts`.
- Fresh RED assertion-order regression: the seed SQL test failed because result parent assertions appeared before `insert into public.national_tournament_editions`.
- Fresh RED migration audit regression: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts` failed because `latest_national_rankings` did not expose `formula.effective_on`.

## GREEN Evidence

- `npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts`: 2 test files passed, 9 tests passed.
- `npm test -- lib/nationalRanking supabase/migrations/nationalRankingMigrations.test.ts`: 6 test files passed, 64 tests passed, 1 skipped.
- `npm run seed:national:sql -- --out /tmp/national-ranking-seed.sql`: exited 0 using `node --import tsx scripts/build-national-ranking-seed-sql.ts`.
- `wc -c -l /tmp/national-ranking-seed.sql`: 1,234,931 bytes and 542 newline-counted lines.
- SQL inspection: first line is `begin;`, final statement is `commit;`.
- Secret/grant inspection: no matches for `grant`, `process.env`, `service_role`, Supabase key/url/secret patterns, `password`, or `api_key`.
- `npm run lint`: exited 0.
- `npm run build`: exited 0; Next.js compiled, TypeScript completed, and static generation completed.
- `git diff --check`: exited 0.

## Files

- Tracked modified: `package.json`, `supabase/migrations/20260712120000_create_national_rankings.sql`, `supabase/migrations/nationalRankingMigrations.test.ts`.
- Added: `lib/nationalRanking/seedPlan.ts`, `lib/nationalRanking/seedPlan.test.ts`, `lib/nationalRanking/seedSql.ts`, `lib/nationalRanking/seedSql.test.ts`, `scripts/build-national-ranking-seed-sql.ts`, `.superpowers/sdd/task-7-report.md`.
- Total Task 7 commit file count: 9 files.

## Requirement Notes

- `sourceReferences`, `displayName`, and `effectiveOn` are persisted through formula seed SQL.
- Optional `sourceEntryId` is mapped to DB empty string with `coalesce(result_input."sourceEntryId", '')`.
- Unresolved source results are retained in source inserts and excluded from ranking contributions.
- Missing parent checks use explicit assertions before result and row insertion, avoiding silent join drops.
- Idempotent publication order respects one-active formula and one-published snapshot partial indexes.
- Missing `--out` path throws `--out requires a following path`.
- Source summary is deterministic count/status metadata and does not include machine paths.
- Apostrophes are SQL-escaped in JSON payloads.

## Concerns

- `npm run build` still emits the existing Next.js warning that it inferred `/Users/parkjinhong/package-lock.json` as the workspace root because multiple lockfiles exist. The command exits 0, and this warning is unrelated to the Task 7 seed generator.
