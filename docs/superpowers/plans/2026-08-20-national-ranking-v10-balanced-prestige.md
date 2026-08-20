# National Ranking v10 Balanced Prestige Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3:2:1 tournament prestige spread with the approved integer 6:5:4 spread while keeping public scores near their current scale.

**Architecture:** Preserve formula v9 as an immutable historical formula and add formula v10 as the active default. Formula v10 reuses the v9 recency and exclusion rules, restores the compact integer stage sequence `21·13·8·5·3·2·1`, and assigns tournament units `6·5·4` so Yanggu is worth 1.5 grade-three events rather than three.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase, Vercel

## Global Constraints

- Keep every existing formula version immutable.
- Use stage units `21`, `13`, `8`, `5`, `3`, `2`, `1`, `0` from champion through first-match loss.
- Use tournament units `6` for Yanggu, `5` for Chuncheon, and `4` for Gyeongin, Inje, and Yeongwol.
- Keep WEMIX excluded and recency units `4`, `2`, `1`.
- Keep all published scores as integers.
- Verify desktop/mobile and light/dark states before shipping.

---

### Task 1: Specify formula v10 with failing tests

**Files:**
- Modify: `lib/nationalRanking/formula.test.ts`
- Modify: `lib/nationalRanking/calculate.test.ts`
- Modify: `lib/nationalRanking/dataset.test.ts`
- Modify: `lib/nationalRanking/seedPlan.test.ts`
- Modify: `lib/nationalRanking/deploymentSql.test.ts`
- Modify: `app/methodology/page.test.tsx`

**Interfaces:**
- Consumes: existing `NationalFormula`, `calculateNationalRankings`, `buildNationalRankingSeedPlan`, and methodology page rendering.
- Produces: executable expectations for `NATIONAL_FORMULA_V10`, recalculated rankings, v10 seed metadata, and public formula copy.

- [ ] **Step 1: Write failing formula and ranking expectations**

Add assertions for version `national-club-v10`, the exact stage/tournament/recency units, WEMIX exclusion, integer score examples, and the recalculated top ranking totals.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/deploymentSql.test.ts app/methodology/page.test.tsx`

Expected: FAIL because formula v10 and its recalculated values do not exist yet.

### Task 2: Implement formula v10 and public methodology

**Files:**
- Modify: `lib/nationalRanking/formula.ts`
- Modify: `lib/nationalRanking/types.ts`
- Modify: `lib/nationalRanking/calculate.ts`
- Modify: `lib/nationalRanking/seedPlan.ts`
- Modify: `app/methodology/page.tsx`

**Interfaces:**
- Consumes: the failing expectations from Task 1.
- Produces: `NATIONAL_FORMULA_V10: NationalFormulaV10` as the default calculator and seed formula.

- [ ] **Step 1: Add the minimal v10 formula implementation**

Define v10 with stage units `21/13/8/5/3/2/1/0`, tournament units `6/5/4/4/4`, excluded slug `wemix`, and recency units inherited from v9.

- [ ] **Step 2: Make v10 the active default everywhere**

Update formula guards, score helpers, ranking calculation, best-result prestige sorting, public row types, and seed-plan metadata from v9 to v10 without modifying v9.

- [ ] **Step 3: Update methodology content**

Render the new tournament weights and integer examples `21 × 6 × 4 = 504점`, `21 × 6 × 2 = 252점`, and `13 × 4 × 4 = 208점`.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/deploymentSql.test.ts app/methodology/page.test.tsx`

Expected: all focused test files pass.

### Task 3: Verify, publish, and inspect production

**Files:**
- Generate outside the repository: `/tmp/national-ranking-v10-seed.sql`

**Interfaces:**
- Consumes: formula v10 and the immutable national ranking source dataset.
- Produces: committed source, an immutable Supabase v10 snapshot, and the Vercel production deployment.

- [ ] **Step 1: Run complete local verification**

Run `npm test`, `npm run lint`, and `npm run build`; require zero failures.

- [ ] **Step 2: Inspect the local experience**

Verify the national ranking and methodology pages at desktop/mobile widths in light/dark mode, checking integer scores, no horizontal overflow, and the exact v10 formula table.

- [ ] **Step 3: Commit and push**

Review the diff, commit only the intentional formula-v10 changes, and push `main` to `origin/main`.

- [ ] **Step 4: Publish the immutable snapshot**

Generate `/tmp/national-ranking-v10-seed.sql`, publish it to the configured Supabase project, and verify the active formula version, row count, and absence of WEMIX contributions.

- [ ] **Step 5: Verify production**

Wait for the pushed Vercel deployment to become ready, then inspect desktop/mobile and light/dark production pages and confirm the production rankings match the locally calculated v10 totals.
