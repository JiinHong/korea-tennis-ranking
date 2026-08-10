# National Ranking Recency And Chevron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish national ranking formula v7 with `3.5 / 2.5 / 1` recency weights, preserve half-point scores, and render a narrower row chevron.

**Architecture:** Keep formula versions v1-v6 immutable and add v7 as the new unit-based default. Recalculate the committed national dataset into a new immutable Supabase snapshot using the existing numeric score columns, then format half-points in the client. Replace the font glyph chevron with one decorative SVG while preserving the existing disclosure state and CSS rotation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest, Testing Library, CSS, Supabase Postgres numeric snapshots, Vercel

## Global Constraints

- Use recency weights `3.5`, `2.5`, and `1`; editions older than two years remain excluded.
- Preserve v6 stage units, tournament prestige units, source results, tie-break order, and crown rules.
- Show at most one fractional digit and never append `.0` to integer totals.
- Keep `.national-ranking-score` as a native table cell so row dividers remain continuous.
- Keep the chevron position, color, expansion rotation, and accessibility behavior; only make its point angle narrower.
- Do not add or alter Supabase tables, columns, functions, policies, grants, or RLS.
- Implement behavior changes with a verified RED-GREEN TDD cycle.
- Inspect mobile and desktop layouts in both light and dark themes.

---

### Task 1: Add Formula V7 And Recalculate Rankings

**Files:**
- Modify: `lib/nationalRanking/formula.test.ts`
- Modify: `lib/nationalRanking/calculate.test.ts`
- Modify: `lib/nationalRanking/dataset.test.ts`
- Modify: `lib/nationalRanking/formula.ts`
- Modify: `lib/nationalRanking/calculate.ts`
- Modify: `lib/nationalRanking/types.ts`
- Test: `lib/nationalRanking/formula.test.ts`
- Test: `lib/nationalRanking/calculate.test.ts`
- Test: `lib/nationalRanking/dataset.test.ts`

**Interfaces:**
- Consumes: existing `NATIONAL_FORMULA_V6`, `calculateNationalRankings`, and unit-scoring helpers.
- Produces: `NationalFormulaV7`, `NATIONAL_FORMULA_V7`, `UnitNationalFormula`, `isUnitNationalFormula`, and v7 as the default calculation result.

- [ ] **Step 1: Write failing formula-v7 tests**

Add `NATIONAL_FORMULA_V7` to the imports and add:

```ts
describe("national ranking formula v7", () => {
  it("rebalances recency without changing stage or tournament units", () => {
    expect(NATIONAL_FORMULA_V7).toMatchObject({
      version: "national-club-v7",
      stageUnits: NATIONAL_FORMULA_V6.stageUnits,
      tournamentUnits: NATIONAL_FORMULA_V6.tournamentUnits,
      recencyUnits: [3.5, 2.5, 1],
    });
  });

  it.each([
    [2026, 577.5],
    [2025, 412.5],
    [2024, 165],
    [2023, 0],
  ])("scores a Yanggu champion from %i at %s points", (editionYear, expected) => {
    expect(
      scoreVerifiedResult(
        {
          stage: "champion",
          tournamentSlug: "yanggu",
          actualEntrants: 64,
          latestEditionYear: 2026,
          editionYear,
        },
        NATIONAL_FORMULA_V7
      )
    ).toBe(expected);
  });
});
```

Update the default-formula calculation assertion from v6/660 to v7/577.5:

```ts
expect(result.formulaVersion).toBe("national-club-v7");
expect(alphaMen?.totalPoints).toBe(577.5);
expect(alphaMen?.contributions).toContainEqual(
  expect.objectContaining({ recencyUnits: 3.5, points: 577.5 })
);
```

Lock the real published dataset to the approved result. Replace the existing
men's scale expectations with `1493.5`, `1406.5`, `1121`, and `991.5`, then add:

```ts
const rows = calculateNationalRankings(loadNationalRankingDataset()).rows;

expect(
  rows.find(
    (row) =>
      row.clubSlug === "seoultech-neutinamu" && row.gender === "women"
  )
).toMatchObject({ rank: 1, totalPoints: 2517 });
expect(
  rows.find(
    (row) =>
      row.clubSlug === "seoultech-neutinamu" && row.gender === "combined"
  )
).toMatchObject({ rank: 1, totalPoints: 3295 });
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts
```

Expected: FAIL because `NATIONAL_FORMULA_V7` and `national-club-v7` do not exist and the default still returns v6.

- [ ] **Step 3: Add the v7 unit-formula types and constant**

Rename the internal integer terminology because v7 contains half units:

```ts
type UnitNationalFormulaBase = {
  readonly stageUnits: Readonly<Record<TournamentStage, number>>;
  readonly tournamentUnits: Readonly<Record<string, number>>;
  readonly recencyUnits: readonly [number, number, number];
};

export type NationalFormulaV7 = UnitNationalFormulaBase & {
  readonly version: "national-club-v7";
};

export type UnitNationalFormula =
  | FieldSizeNationalFormula
  | NationalFormulaV5
  | NationalFormulaV6
  | NationalFormulaV7;
```

Rename `isIntegerNationalFormula` to `isUnitNationalFormula`, update its call sites and helper parameter types, then add:

```ts
export const NATIONAL_FORMULA_V7: NationalFormulaV7 = Object.freeze({
  version: "national-club-v7",
  stageUnits: NATIONAL_FORMULA_V6.stageUnits,
  tournamentUnits: NATIONAL_FORMULA_V6.tournamentUnits,
  recencyUnits: Object.freeze([3.5, 2.5, 1] as const),
});
```

Include `NationalFormulaV7` in `NationalFormula`, the unit-formula guard, and every `scoreVerifiedResult` overload that accepts a unit formula. Make `NATIONAL_FORMULA_V7` the default of `getStagePoints`, `getRecencyUnits`, `getTournamentUnits`, and `scoreVerifiedResult` where v6 is currently the default.

- [ ] **Step 4: Make v7 the calculation default**

In `calculate.ts`, import `NATIONAL_FORMULA_V7` and `isUnitNationalFormula`. Use v7 for the default formula and for the tournament-unit ordering used by best-result presentation:

```ts
export function calculateNationalRankings(
  dataset: NationalRankingDataset,
  formula: NationalFormula = NATIONAL_FORMULA_V7
): CalculatedNationalRanking {
```

Extend `CalculatedNationalRanking["formulaVersion"]` with `"national-club-v7"` in `types.ts`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts
```

Expected: both files PASS and default calculations preserve exact `.5` values without rounding.

- [ ] **Step 6: Commit formula v7**

```bash
git add lib/nationalRanking/formula.ts lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts lib/nationalRanking/types.ts
git commit -m "feat: rebalance national ranking recency"
```

### Task 2: Publish V7 Metadata And Methodology

**Files:**
- Modify: `lib/nationalRanking/seedPlan.test.ts`
- Modify: `lib/nationalRanking/deploymentSql.test.ts`
- Modify: `app/methodology/page.test.tsx`
- Modify: `lib/nationalRanking/seedPlan.ts`
- Modify: `app/methodology/page.tsx`
- Test: `lib/nationalRanking/seedPlan.test.ts`
- Test: `lib/nationalRanking/deploymentSql.test.ts`
- Test: `app/methodology/page.test.tsx`

**Interfaces:**
- Consumes: `NATIONAL_FORMULA_V7` and default v7 calculated rows from Task 1.
- Produces: `National Club Ranking v7` snapshot metadata effective `2026-08-11`, generated SQL containing v7, and matching public methodology copy.

- [ ] **Step 1: Write failing v7 publication tests**

Update seed-plan expectations:

```ts
expect(plan.formula).toMatchObject({
  version: "national-club-v7",
  displayName: "National Club Ranking v7",
  effectiveOn: "2026-08-11",
  config: expect.objectContaining({
    version: "national-club-v7",
    recencyUnits: [3.5, 2.5, 1],
  }),
});
```

Update deployment SQL expectations to require `'national-club-v7'`. Update methodology tests to require `national-club-v7`, `2026-08-11`, weights `3.5`, `2.5`, `1`, and the exact example strings:

```ts
expect(screen.getByText(/= 577\.5점$/)).toBeDefined();
expect(screen.getByText(/= 412\.5점$/)).toBeDefined();
expect(screen.getByText(/= 238점$/)).toBeDefined();
```

- [ ] **Step 2: Run publication tests and verify RED**

Run:

```bash
npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/deploymentSql.test.ts app/methodology/page.test.tsx
```

Expected: FAIL because seed and methodology metadata still identify v6 and show `4 / 2 / 1`.

- [ ] **Step 3: Thread v7 through seed metadata**

Replace the v6 import and formula type references in `seedPlan.ts` with v7, then publish:

```ts
formula: {
  version: NATIONAL_FORMULA_V7.version,
  displayName: "National Club Ranking v7",
  config: NATIONAL_FORMULA_V7,
  effectiveOn: "2026-08-11",
  sourceReferences: PRIMARY_METHODOLOGY_REFERENCES,
},
```

Keep existing numeric SQL row types unchanged; `totalPoints`, `latestEditionPoints`, and `maxContribution` already use Postgres `numeric`.

- [ ] **Step 4: Update methodology copy and examples**

Use `NATIONAL_FORMULA_V7` throughout `app/methodology/page.tsx`, set `FORMULA_EFFECTIVE_ON` to `2026-08-11`, and change the metric statement to:

```tsx
모든 입력은 정수이며, 연도 가중치 적용 후 최종 점수는 0.5점 단위로
계산합니다. 별도의 반올림은 사용하지 않습니다.
```

Update the recency description to `3.5`, `2.5`, and `1`. Replace the examples with:

```tsx
<code>55 × 3 × 3.5 = 577.5점</code>
<code>55 × 3 × 2.5 = 412.5점</code>
<code>34 × 2 × 3.5 = 238점</code>
```

- [ ] **Step 5: Run publication tests and verify GREEN**

Run:

```bash
npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/deploymentSql.test.ts app/methodology/page.test.tsx
```

Expected: all three files PASS and generated metadata is v7.

- [ ] **Step 6: Commit v7 publication metadata**

```bash
git add lib/nationalRanking/seedPlan.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/deploymentSql.test.ts app/methodology/page.tsx app/methodology/page.test.tsx
git commit -m "feat: document national ranking formula v7"
```

### Task 3: Preserve Half-Point Scores In The Ranking UI

**Files:**
- Modify: `app/_components/national-ranking/NationalRankingTable.test.tsx`
- Modify: `app/_components/national-ranking/NationalRankingTable.tsx`
- Test: `app/_components/national-ranking/NationalRankingTable.test.tsx`

**Interfaces:**
- Consumes: numeric `row.points` values from the public ranking repository.
- Produces: localized score text that keeps `.5` and omits `.0`.

- [ ] **Step 1: Write a failing score-format test**

Add a row with `points: 1234.5`, render the table, and assert both integer and half-point behavior:

```ts
expect(screen.getByText("1,234")).toBeDefined();
expect(screen.getByText("1,234.5")).toBeDefined();
expect(screen.queryByText("1,234.0")).toBeNull();
```

- [ ] **Step 2: Run the table test and verify RED**

Run:

```bash
npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx
```

Expected: FAIL because `maximumFractionDigits: 0` rounds the half-point value.

- [ ] **Step 3: Allow one optional fractional digit**

Change the formatter to:

```ts
const scoreFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});
```

- [ ] **Step 4: Run the table test and verify GREEN**

Run:

```bash
npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx
```

Expected: PASS with exact integer and half-point strings.

- [ ] **Step 5: Commit score formatting**

```bash
git add app/_components/national-ranking/NationalRankingTable.tsx app/_components/national-ranking/NationalRankingTable.test.tsx
git commit -m "feat: display national ranking half-points"
```

### Task 4: Narrow The Ranking Row Chevron

**Files:**
- Modify: `app/_components/national-ranking/NationalRankingTable.test.tsx`
- Modify: `app/globals.test.ts`
- Modify: `app/_components/national-ranking/NationalRankingTable.tsx`
- Modify: `app/globals.css`
- Test: `app/_components/national-ranking/NationalRankingTable.test.tsx`
- Test: `app/globals.test.ts`

**Interfaces:**
- Consumes: the existing `.national-ranking-row-chevron` wrapper and `data-expanded` rotation contract.
- Produces: one `aria-hidden` inline SVG chevron using `currentColor`, with the wrapper still rotating `90deg` on expansion.

- [ ] **Step 1: Write failing SVG chevron tests**

Extend the table structure test:

```ts
const chevron = firstScore?.querySelector(".national-ranking-row-chevron");
expect(chevron?.querySelector("svg")).not.toBeNull();
expect(chevron?.querySelector("path")?.getAttribute("d")).toBe(
  "M1 1.5 9 7 1 12.5"
);
expect(chevron?.textContent?.trim()).toBe("");
```

Add CSS contract assertions:

```ts
expect(css).toMatch(
  /\.national-ranking-row-chevron svg\s*\{[^}]*display:\s*block;[^}]*width:\s*10px;[^}]*height:\s*14px;[^}]*\}/
);
expect(css).toMatch(
  /\.national-ranking-row-chevron path\s*\{[^}]*fill:\s*none;[^}]*stroke:\s*currentColor;[^}]*stroke-width:\s*1\.6;[^}]*stroke-linecap:\s*round;[^}]*stroke-linejoin:\s*round;[^}]*\}/
);
```

- [ ] **Step 2: Run chevron tests and verify RED**

Run:

```bash
npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.test.ts
```

Expected: FAIL because the current chevron contains the `〉` text glyph and no SVG.

- [ ] **Step 3: Replace the glyph with a decorative SVG**

Replace the span contents with:

```tsx
<svg focusable="false" viewBox="0 0 10 14">
  <path d="M1 1.5 9 7 1 12.5" />
</svg>
```

Keep `aria-hidden="true"` on the wrapper. Remove font-size rules from the wrapper and add:

```css
.national-ranking-row-chevron svg {
  display: block;
  width: 10px;
  height: 14px;
  overflow: visible;
}

.national-ranking-row-chevron path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
```

Keep desktop `margin-left: 12px`, mobile `margin-left: 8px`, the existing transform origin, transition, expanded rotation, and reduced-motion override.

- [ ] **Step 4: Run chevron tests and verify GREEN**

Run:

```bash
npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.test.ts
```

Expected: both files PASS; expansion behavior and table-cell divider contracts remain covered.

- [ ] **Step 5: Commit the chevron refinement**

```bash
git add app/_components/national-ranking/NationalRankingTable.tsx app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.css app/globals.test.ts
git commit -m "fix: sharpen national ranking row chevrons"
```

### Task 5: Verify, Ship, And Publish The V7 Snapshot

**Files:**
- Generate temporarily: `/tmp/national-ranking-v7-seed.sql`
- No committed schema migration.

**Interfaces:**
- Consumes: the committed v7 formula, seed generator, public Supabase ranking view, and Vercel deployment from Tasks 1-4.
- Produces: verified `origin/main`, a Ready production deployment, and a published v7 ranking snapshot.

- [ ] **Step 1: Run focused ranking verification**

Run:

```bash
npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/dataset.test.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/deploymentSql.test.ts lib/nationalRanking/repository.test.ts app/methodology/page.test.tsx app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.test.ts
```

Expected: all focused files PASS. Confirm dataset assertions intentionally reflect v7 and Neutinamu women are rank 1 with `2,517` points.

- [ ] **Step 2: Run full local verification**

Run each command separately:

```bash
git diff --check
npm test
npm run lint
npm run build
```

Expected: `git diff --check` is empty, the full suite has zero failures, lint exits 0, and the production build completes.

- [ ] **Step 3: Inspect all local visual states**

Start the development server and inspect `/` and `/methodology` at desktop and mobile widths in light and dark themes. Verify:

- integer scores omit `.0` and any half-point score shows `.5`;
- the score column remains right-aligned with one continuous row divider;
- the collapsed chevron has a narrower point than the previous `〉` glyph;
- the expanded chevron points downward;
- hover never flashes white in dark mode;
- no horizontal overflow or clipped score appears.

- [ ] **Step 4: Run diff-scoped code review and resolve findings**

Review the branch against `origin/main` for formula correctness, data integrity, tests, project standards, and UI regressions. Apply only validated findings, rerun affected tests, and leave the branch clean.

- [ ] **Step 5: Commit remaining verified changes**

Stage named files only. If review produces no follow-up diff, skip this commit. Otherwise use:

```bash
git commit -m "fix: address national ranking v7 review"
```

- [ ] **Step 6: Fast-forward main and push**

Fetch `origin/main`, fast-forward the local `main` branch, merge the feature branch with `--ff-only`, rerun the full verification commands, then:

```bash
git push origin main
```

Expected: local `main`, `origin/main`, and the verified commit have the same SHA.

- [ ] **Step 7: Wait for the production deployment**

Confirm the Vercel deployment created from the pushed commit reaches `Ready`. Smoke-test the production `/` and `/methodology` pages before publishing fractional data so the deployed formatter can display `.5` safely.

- [ ] **Step 8: Generate and review the v7 seed transaction**

Run:

```bash
npm run seed:national:sql -- --out /tmp/national-ranking-v7-seed.sql
```

Verify the transaction contains `national-club-v7`, `National Club Ranking v7`, effective date `2026-08-11`, numeric half-point row values, and no schema/permission statements.

- [ ] **Step 9: Publish and verify the Supabase snapshot**

Execute `/tmp/national-ranking-v7-seed.sql` through the connected Supabase project, then query the public view:

```sql
select formula_version, gender, rank, total_points, club_slug
from public.latest_national_rankings
where club_slug = 'seoultech-neutinamu'
   or total_points <> trunc(total_points)
order by gender, rank;
```

Expected: formula version is `national-club-v7`; Neutinamu women are rank 1 with `2517`; Neutinamu combined are rank 1 with `3295`; at least one row preserves a `.5` value. Run Supabase security and performance advisors and confirm this snapshot-only publish introduces no new issue.

- [ ] **Step 10: Perform production visual smoke tests**

After the page cache refreshes, inspect production `/` and `/methodology` in mobile and desktop light/dark states. Confirm v7 metadata, the published scores, the narrower chevron, row expansion, score formatting, and continuous dividers.

- [ ] **Step 11: Confirm final repository state**

Verify `git status --short --branch` is clean and `git rev-parse HEAD` equals `git rev-parse origin/main`. Report the final commit SHA, test counts, deployment status, Supabase verification values, and any pre-existing advisor warnings separately.
