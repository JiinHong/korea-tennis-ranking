# National Ranking Canonicalization and Honors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a corrected national club dataset, exact integer formula v3, permanent championship/runner-up honors, and accessible crown UI backed by a secure Supabase snapshot.

**Architecture:** The committed JSON remains the canonical source manifest. Pure TypeScript calculation turns verified results into active three-edition contributions and independent all-time honors; seed generation persists both in one immutable snapshot. The public repository reads the published `security_invoker` view, and the client table renders exact integer scores plus interactive crown tooltips.

**Tech Stack:** TypeScript 5, Next.js 16 App Router, React 19, Vitest/Testing Library, Supabase Postgres with RLS, CSS, PNG assets.

## Global Constraints

- Follow strict red-green-refactor TDD; no production behavior is changed before its failing test is observed.
- Formula version is exactly `national-club-v3`.
- Every score operation uses integers only; no division, logarithm, floating-point factor, or rounding is allowed.
- Scoring keeps only the best team per `(club, gender, competition, edition year)`.
- WEMIX OPEN 2025 fields are exactly 8 men's teams and 12 women's teams.
- School-only source assignments are frozen into the committed `clubSlug`; they are never recomputed at request time.
- Championship and runner-up honors remain after their contribution ages out of the score window.
- `단국대학교 천안캠퍼스 DKUTC` and `단국대학교 죽전캠퍼스 DKUTC` remain separate clubs.
- Unconfirmed same-university clubs remain separate.
- Supabase public access remains read-only, RLS-backed, and exposed through a `security_invoker = true` view.
- Never expose a Supabase secret/service-role key to browser code.
- Desktop crown help opens on hover/focus; touch help opens on tap and closes on outside tap or Escape.

---

### Task 1: Canonicalize club identities and verify WEMIX source rows

**Files:**
- Modify: `data/national-ranking/v1/dataset.json`
- Modify: `data/national-ranking/v1/README.md`
- Modify: `lib/nationalRanking/dataset.test.ts`

**Interfaces:**
- Consumes: existing `NationalRankingDataset` JSON contract.
- Produces: canonical club slugs, aliases, rewritten result references, and verified `wemix-2025-men`/`wemix-2025-women` editions for all later tasks.

- [ ] **Step 1: Replace obsolete identity expectations with failing canonicalization assertions**

Add table-driven expectations to `dataset.test.ts` for each administrator-confirmed merge and explicit campus split:

```ts
const canonicalAliases = [
  ["경기대학교 KTF", "gyeonggi-ktf"],
  ["경기대학교 Kft", "gyeonggi-ktf"],
  ["경기대학교 테토남", "gyeonggi-ktf"],
  ["성균관대학교 공자", "sungkyunkwan-stc"],
  ["성균관대학교 SIT", "sungkyunkwan-stc"],
  ["연세대학교 쿠크리스", "yonsei-cookie-das"],
  ["충남대학교 콧샷", "chungnam-good-shot"],
] as const;

it.each(canonicalAliases)("%s를 %s로 정규화한다", (sourceLabel, clubSlug) => {
  const dataset = loadNationalRankingDataset();
  expect(dataset.aliases).toContainEqual(
    expect.objectContaining({ sourceLabel, clubSlug })
  );
});

it("단국대 DKUTC를 천안과 죽전 캠퍼스로 분리한다", () => {
  const dataset = loadNationalRankingDataset();
  expect(dataset.clubs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        slug: "dankook-cheonan-dkutc",
        universityName: "단국대학교 천안캠퍼스",
      }),
      expect.objectContaining({
        slug: "dankook-jukjeon-dkutc",
        universityName: "단국대학교 죽전캠퍼스",
      }),
    ])
  );
});
```

Also invert the existing tests that currently require `Kft` and `쿠크리스` to remain separate.

- [ ] **Step 2: Run the dataset tests and verify RED**

Run: `npm test -- lib/nationalRanking/dataset.test.ts`

Expected: FAIL because the current manifest still contains split club records and unresolved WEMIX editions.

- [ ] **Step 3: Rewrite canonical club, alias, and result references**

Update `dataset.json` mechanically so the canonical records and aliases exactly match the design spec. Remove merged-away club records only after every alias and result points to the canonical slug. Preserve separate records for Korea University KUTC/PETC/KMTC, Yonsei YUTT/쿠크다스, Dankook ACE, and Hanyang ERICA 하이텍.

Set campus-unspecified DKUTC result slugs by gender:

```ts
const historicDankookClub = {
  men: "dankook-jukjeon-dkutc",
  women: "dankook-cheonan-dkutc",
} as const;
```

Set `wemix-2025-men.actualEntrants = 8`, `wemix-2025-women.actualEntrants = 12`, and both `sourceStatus = "verified"`. Rewrite all visible WEMIX terminal results to verified canonical clubs, including clipped 서울과기대 느티나무 and 가천대 타이브레이크 labels. Freeze school-only assignments documented in the design spec into `clubSlug` and record the inference in `note`.

- [ ] **Step 4: Add failing integrity assertions for rewritten results and WEMIX**

```ts
it("WEMIX 2025의 실제 대진 규모와 모든 소속을 확정한다", () => {
  const dataset = loadNationalRankingDataset();
  const editions = dataset.editions.filter((edition) =>
    edition.key.startsWith("wemix-2025-")
  );
  const results = dataset.results.filter((result) =>
    result.editionKey.startsWith("wemix-2025-")
  );

  expect(editions.map(({ gender, actualEntrants, sourceStatus }) => ({
    gender,
    actualEntrants,
    sourceStatus,
  }))).toEqual([
    { gender: "men", actualEntrants: 8, sourceStatus: "verified" },
    { gender: "women", actualEntrants: 12, sourceStatus: "verified" },
  ]);
  expect(results.every((result) =>
    result.clubSlug !== null && result.qualityStatus === "verified"
  )).toBe(true);
});

it("삭제된 병합 슬러그를 어떤 결과도 참조하지 않는다", () => {
  const dataset = loadNationalRankingDataset();
  const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
  expect(dataset.results.every((result) =>
    result.clubSlug === null || clubSlugs.has(result.clubSlug)
  )).toBe(true);
});
```

- [ ] **Step 5: Run the dataset tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/dataset.test.ts`

Expected: all dataset validation, alias uniqueness, participant-count, and source-reference tests pass.

- [ ] **Step 6: Update the source documentation and commit**

Document formula-v3 identity policy, WEMIX verification, frozen school-only assignment, and the smaller unresolved count in `README.md`.

```bash
git add data/national-ranking/v1 lib/nationalRanking/dataset.test.ts
git commit -m "data: canonicalize national club identities"
```

### Task 2: Replace fractional scoring with exact formula v3

**Files:**
- Modify: `lib/nationalRanking/types.ts`
- Modify: `lib/nationalRanking/formula.ts`
- Modify: `lib/nationalRanking/formula.test.ts`
- Modify: `lib/nationalRanking/calculate.ts`
- Modify: `lib/nationalRanking/calculate.test.ts`

**Interfaces:**
- Produces: `NATIONAL_FORMULA_V3`, `getFieldSizeUnits`, `getRecencyUnits`, `getTournamentUnits`, and integer `scoreVerifiedResult` output.
- Consumes: canonical dataset from Task 1.

- [ ] **Step 1: Write failing formula-v3 tests**

```ts
describe("national ranking formula v3", () => {
  it("uses the approved integer unit tables", () => {
    expect(NATIONAL_FORMULA_V3).toMatchObject({
      version: "national-club-v3",
      stageUnits: {
        champion: 21,
        runner_up: 13,
        semifinal: 8,
        quarterfinal: 5,
        round_of_16: 3,
        round_of_32: 2,
        round_of_64: 1,
        first_match_loss: 0,
      },
      tournamentUnits: { yanggu: 3, gyeongin: 2, chuncheon: 2, inje: 1, wemix: 1 },
    });
  });

  it.each([[8, 1], [12, 1], [13, 2], [31, 2], [32, 3], [63, 3], [64, 4]])(
    "%i개 참가팀을 규모 단위 %i로 바꾼다",
    (entrants, expected) => expect(getFieldSizeUnits(entrants)).toBe(expected)
  );

  it.each([[2025, 2025, 3], [2025, 2024, 2], [2025, 2023, 1], [2025, 2022, 0]])(
    "최근 연도 %i, 개최 연도 %i는 %i 단위다",
    (latest, edition, expected) => expect(getRecencyUnits(latest, edition)).toBe(expected)
  );

  it("WEMIX 우승 점수를 정확한 정수로 계산한다", () => {
    expect(scoreVerifiedResult({
      stage: "champion",
      tournamentSlug: "wemix",
      actualEntrants: 8,
      latestEditionYear: 2025,
      editionYear: 2025,
    })).toBe(63);
  });
});
```

- [ ] **Step 2: Run formula tests and verify RED**

Run: `npm test -- lib/nationalRanking/formula.test.ts`

Expected: FAIL because v3 and integer-unit helpers do not exist.

- [ ] **Step 3: Implement immutable formula-v3 unit tables**

Define `FormulaV3Input` with `tournamentSlug`, add `national-club-v3` to the output union, and make v3 the default. Implement score calculation as a direct multiplication:

```ts
return (
  formula.stageUnits[input.stage] *
  getTournamentUnits(input.tournamentSlug, formula) *
  getFieldSizeUnits(input.actualEntrants, formula) *
  getRecencyUnits(input.latestEditionYear, input.editionYear, formula)
);
```

Keep v1/v2 constants only where existing reproducibility tests need them; do not route current snapshots through them.

- [ ] **Step 4: Run formula tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/formula.test.ts`

Expected: all v3 examples equal exact integers and legacy reproducibility remains green.

- [ ] **Step 5: Write failing calculator tests for exact totals and best-team deduplication**

Add a v3 fixture with two teams from one canonical club in one edition. Assert only the higher stage contributes, every points field is `Number.isInteger`, and the formula version is v3.

```ts
expect(result.formulaVersion).toBe("national-club-v3");
expect(result.rows.every((row) =>
  Number.isInteger(row.totalPoints) &&
  row.contributions.every((item) => Number.isInteger(item.points))
)).toBe(true);
```

- [ ] **Step 6: Run calculator tests and verify RED**

Run: `npm test -- lib/nationalRanking/calculate.test.ts`

Expected: FAIL because the calculator still defaults to v2 fractional factors.

- [ ] **Step 7: Route active contributions through formula v3**

Replace v2 prestige-factor branching with `tournamentSlug` input, use recency units to skip expired contributions, and retain existing best-team and tie-break ordering.

- [ ] **Step 8: Run formula and calculator tests and commit**

Run: `npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts`

Expected: all formula and calculator tests pass with integer totals.

```bash
git add lib/nationalRanking/types.ts lib/nationalRanking/formula.ts lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.ts lib/nationalRanking/calculate.test.ts
git commit -m "feat: calculate exact national ranking points"
```

### Task 3: Calculate permanent all-time honors independently from points

**Files:**
- Modify: `lib/nationalRanking/types.ts`
- Modify: `lib/nationalRanking/calculate.ts`
- Modify: `lib/nationalRanking/calculate.test.ts`

**Interfaces:**
- Produces: `NationalRankingHonor` and `CalculatedRankingRow.honors`.
- Consumes: all results with concrete champion/runner-up identity, including expired or non-scoreable editions.

- [ ] **Step 1: Write failing all-time honor tests**

```ts
it("점수 기간이 끝난 우승 기록도 통산 honor로 보존한다", () => {
  const result = calculateNationalRankings(datasetWithExpiredChampion);
  const row = result.rows.find((item) => item.clubSlug === "alpha" && item.gender === "men");

  expect(row?.totalPoints).toBe(0);
  expect(row?.honors).toContainEqual({
    editionKey: "yanggu-2021-men",
    tournamentSlug: "yanggu",
    tournamentName: "국토정중앙배(양구)",
    year: 2021,
    gender: "men",
    stage: "champion",
  });
});

it("종합 랭킹은 남녀 통산 honor를 합친다", () => {
  const combined = calculateNationalRankings(datasetWithGenderHonors).rows.find(
    (row) => row.clubSlug === "alpha" && row.gender === "combined"
  );
  expect(combined?.honors.map((honor) => honor.gender)).toEqual(["women", "men"]);
});
```

- [ ] **Step 2: Run calculator tests and verify RED**

Run: `npm test -- lib/nationalRanking/calculate.test.ts`

Expected: FAIL because ranking rows do not expose `honors`.

- [ ] **Step 3: Build and attach honor maps before score-window filtering**

Create one honor for each concrete `champion`/`runner_up` result whose edition and tournament exist. Deduplicate by `(clubSlug, editionKey, gender, stage)`, sort by year descending then configured tournament order, and attach gender-specific arrays in `createRankingRow`. Merge arrays in `combineRankingRows`.

Keep `championships` and `runnerUps` derived from active `contributions`, not from all-time honors.

- [ ] **Step 4: Run calculator tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/calculate.test.ts`

Expected: active points and tie-break counts remain unchanged while all-time honors pass.

- [ ] **Step 5: Commit honor calculation**

```bash
git add lib/nationalRanking/types.ts lib/nationalRanking/calculate.ts lib/nationalRanking/calculate.test.ts
git commit -m "feat: preserve national club honors"
```

### Task 4: Persist honors in the Supabase snapshot and public view

**Files:**
- Create via Supabase CLI: the timestamped file in `supabase/migrations/` ending `_add_national_ranking_honors.sql`
- Modify: `supabase/migrations/nationalRankingMigrations.test.ts`
- Modify: `lib/nationalRanking/seedPlan.ts`
- Modify: `lib/nationalRanking/seedPlan.test.ts`
- Modify: `lib/nationalRanking/seedSql.ts`
- Modify: `lib/nationalRanking/seedSql.test.ts`
- Modify: `lib/nationalRanking/repository.ts`
- Modify: `lib/nationalRanking/repository.test.ts`

**Interfaces:**
- Produces: `national_ranking_rows.honors jsonb`, `latest_national_rankings.honors`, and public `PublicNationalRankingRow.honors`.
- Consumes: calculated v3 rows from Tasks 2-3.

- [ ] **Step 1: Confirm current Supabase constraints before schema work**

Run: `curl -fsSL https://supabase.com/changelog.md | rg -n "breaking-change|Data API|Postgres" | head -n 40`

Expected: no breaking change conflicts with adding a JSONB column; explicit grants and `security_invoker` remain required.

Run: `npx supabase --version && npx supabase migration new add_national_ranking_honors`

Expected: Supabase creates the timestamped migration file; do not invent the filename.

- [ ] **Step 2: Write failing migration tests**

Read the migration by suffix and assert it includes:

```ts
expect(sql).toContain("add column if not exists honors jsonb not null default '[]'::jsonb");
expect(sql).toContain("check (jsonb_typeof(honors) = 'array')");
expect(normalizedSql).toMatch(latestViewPattern);
expect(normalizedSql).toContain("ranking_row.honors");
expect(normalizedSql).toContain("security_invoker = true");
expect(normalizedSql).toContain("grant select on public.latest_national_rankings to anon");
```

- [ ] **Step 3: Run migration tests and verify RED**

Run: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts`

Expected: FAIL because the generated migration is empty.

- [ ] **Step 4: Implement the additive migration**

Add `honors jsonb`, a named array-type check, recreate the public view with all existing audit columns plus `ranking_row.honors`, retain `security_invoker = true`, revoke from `public/anon/authenticated`, then grant select only to `anon` and `service_role` as before. Do not add any browser write permission.

- [ ] **Step 5: Run migration tests and verify GREEN**

Run: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts`

Expected: migration security, grants, view, and JSON contract tests pass.

- [ ] **Step 6: Write failing seed and repository tests**

Assert the seed plan publishes `National Club Ranking v3`, row JSON contains `honors`, generated SQL inserts `honors`, and repository parsing rejects non-array honors while mapping valid honors unchanged.

```ts
expect(plan.formula.version).toBe("national-club-v3");
expect(sql).toContain('"honors" jsonb');
expect(pageData?.rankings.men[0]?.honors).toEqual(viewRows[0].honors);
```

- [ ] **Step 7: Run seed/repository tests and verify RED**

Run: `npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/repository.test.ts`

Expected: FAIL because v2 and the old view-row shape are still in use.

- [ ] **Step 8: Thread v3 honors through seed and read models**

Use `NATIONAL_FORMULA_V3`, include `honors` in `RankingRowRecord`, `row_input`, inserts, immutable-snapshot equality assertions, Supabase select strings, runtime validation, and public rows. Change the cache key to `national-ranking-v3`.

- [ ] **Step 9: Run persistence tests, generate SQL, and commit**

Run: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/repository.test.ts`

Run: `npm run seed:national:sql -- --out /tmp/national-ranking-v3-seed.sql`

Expected: tests pass and generated SQL contains one transaction, formula v3, integer points, canonical slugs, WEMIX rows, and honors arrays.

```bash
git add supabase/migrations lib/nationalRanking/seedPlan.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/repository.ts lib/nationalRanking/repository.test.ts
git commit -m "feat: publish national ranking honors"
```

### Task 5: Render exact scores and accessible crown tooltips

**Files:**
- Create: `app/NationalRankingHonor.tsx`
- Create: `app/NationalRankingHonor.test.tsx`
- Modify: `app/NationalRankingTable.tsx`
- Modify: `app/NationalRankingTable.test.tsx`
- Modify: `app/RankingMethodologyInfo.tsx`
- Modify: `app/RankingMethodologyInfo.test.tsx`
- Modify: `app/globals.css`
- Create: `public/national-ranking/gold-crown.png`
- Create: `public/national-ranking/silver-crown.png`

**Interfaces:**
- Consumes: `PublicNationalRankingRow.honors` from Task 4.
- Produces: one visual and accessible crown per all-time honor.

- [ ] **Step 1: Copy the approved transparent crown assets**

Copy `/Users/parkjinhong/Downloads/gold crown.png` and `silver crown.png` to stable public filenames. Verify the images remain transparent and are not wrapped in a UI badge.

```bash
mkdir -p public/national-ranking
cp "/Users/parkjinhong/Downloads/gold crown.png" public/national-ranking/gold-crown.png
cp "/Users/parkjinhong/Downloads/silver crown.png" public/national-ranking/silver-crown.png
```

- [ ] **Step 2: Write failing crown interaction tests**

```tsx
it("우승 왕관을 탭하면 상세 기록을 열고 바깥 탭과 Escape로 닫는다", () => {
  render(<NationalRankingHonor honor={championHonor} />);
  const trigger = screen.getByRole("button", { name: "2025 위믹스 여자부 우승" });

  fireEvent.click(trigger);
  expect(screen.getByText("2025 위믹스 여자부 우승").getAttribute("data-open")).toBe("true");
  fireEvent.pointerDown(document.body);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(document.activeElement).toBe(trigger);
});

it("우승과 준우승에 서로 다른 왕관 이미지를 쓴다", () => {
  const { rerender } = render(<NationalRankingHonor honor={championHonor} />);
  expect(screen.getByRole("img").getAttribute("src")).toContain("gold-crown");
  rerender(<NationalRankingHonor honor={runnerUpHonor} />);
  expect(screen.getByRole("img").getAttribute("src")).toContain("silver-crown");
});
```

- [ ] **Step 3: Run crown tests and verify RED**

Run: `npm test -- app/NationalRankingHonor.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 4: Implement the reusable crown component**

Follow the existing methodology tooltip's state/ref/outside-pointer/Escape pattern. Format labels using tournament short names (`양구`, `경인지구`, `인제`, `춘천`, `위믹스`), gender, and stage. Use CSS `@media (hover: hover)` for desktop hover and button click state for touch.

- [ ] **Step 5: Run crown tests and verify GREEN**

Run: `npm test -- app/NationalRankingHonor.test.tsx`

Expected: hover-compatible markup, focus, tap toggle, outside tap, and Escape tests pass.

- [ ] **Step 6: Write failing ranking-table tests**

Add men/women/combined fixture honors and assert crown counts follow active tab, school links still wrap only text, and exact integer scores render without decimals:

```ts
expect(screen.getByText("1,235")).toBeDefined();
expect(screen.queryByText("1,234.6")).toBeNull();
expect(screen.getAllByRole("button", { name: /우승|준우승/ })).toHaveLength(2);
```

- [ ] **Step 7: Run table tests and verify RED**

Run: `npm test -- app/NationalRankingTable.test.tsx`

Expected: FAIL because score formatting still permits one decimal and honors are not rendered.

- [ ] **Step 8: Render crowns after club identity and stabilize responsive layout**

Set `maximumFractionDigits: 0`, render an inline `.national-ranking-honors` group after the university/club text, and add fixed icon dimensions plus wrapping constraints so score cells never overlap on mobile. Preserve the horizontal-only table lines and rank tier colors.

- [ ] **Step 9: Update methodology copy and tests**

Replace the obsolete WEMIX exclusion sentence with concise formula-v3 copy:

```text
진출 단계, 대회 위상, 참가 규모, 최신 대회 순서에 정수 단위를 적용합니다.
같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.
우승과 준우승 왕관은 점수 산정 기간이 지나도 통산 기록으로 남습니다.
```

- [ ] **Step 10: Run UI tests and commit**

Run: `npm test -- app/NationalRankingHonor.test.tsx app/NationalRankingTable.test.tsx app/RankingMethodologyInfo.test.tsx`

Expected: all UI tests pass.

```bash
git add app/NationalRankingHonor.tsx app/NationalRankingHonor.test.tsx app/NationalRankingTable.tsx app/NationalRankingTable.test.tsx app/RankingMethodologyInfo.tsx app/RankingMethodologyInfo.test.tsx app/globals.css public/national-ranking
git commit -m "feat: show national ranking honors"
```

### Task 6: Apply, publish, and visually verify the ranking refresh

**Files:**
- Modify if required by verified behavior: `app/methodology/page.tsx`
- Modify: `data/national-ranking/v1/README.md`
- No other production changes unless a failing regression test or browser defect proves they are necessary.

**Interfaces:**
- Consumes: migration and `/tmp/national-ranking-v3-seed.sql`.
- Produces: published Supabase v3 snapshot and deployed national ranking page.

- [ ] **Step 1: Run the complete local verification suite**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: every command exits 0, no score assertion expects decimals, and no stale split-club expectation remains.

- [ ] **Step 2: Verify and apply the additive Supabase migration**

Use the connected Supabase MCP/CLI to inspect migration state, apply the generated migration to the linked project, and query:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'national_ranking_rows'
  and column_name = 'honors';
```

Expected: one `jsonb` row. Run database advisors and confirm no new security or performance finding is introduced.

- [ ] **Step 3: Execute and verify the v3 seed transaction**

Execute `/tmp/national-ranking-v3-seed.sql` with the service-role/server-only path, then query the public view as `anon` and assert:

```sql
select formula_version, gender, rank, total_points, honors
from public.latest_national_rankings
order by gender, rank
limit 10;
```

Expected: formula v3, integer-valued points, array honors, WEMIX contributions, canonical club names, and no merged-away club row.

- [ ] **Step 4: Start the app and run desktop/mobile browser QA**

Run: `npm run dev -- --port 3020`

Inspect `/` at desktop and 390px mobile widths. Capture screenshots and verify:

- men/women/combined tabs show the correct honor subset;
- gold/silver crown images are crisp, inline, and never overlap score text;
- desktop hover and keyboard focus reveal tooltips;
- mobile tap toggles one tooltip, outside tap closes it;
- exact integer scores contain no decimal separator;
- 서울과기대/PETC club-name links still navigate correctly;
- no console error or hydration warning appears.

- [ ] **Step 5: Commit any test-proven polish and update source documentation**

If QA reveals a defect, first add a failing regression test, then apply the smallest fix and rerun the affected test plus build. Update the README's final dataset counts and formula version.

- [ ] **Step 6: Final review, main integration, and deployment verification**

Run a diff-scoped code review, `git diff --check`, and the full verification commands again. Commit remaining verified changes, fast-forward the clean main branch, push `main`, and inspect the Vercel production deployment plus `https://koreatennisranking.com/`.

Expected: production serves the v3 snapshot and all public interactions match local screenshots.
