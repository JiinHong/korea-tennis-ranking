# Expandable National Ranking Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2025 bronze semifinal crowns, instant one-row ranking expansions with each club's three best all-time results, and division-preserving club result pages.

**Architecture:** Derive and store `bestResults` in each immutable national ranking snapshot so opening a row requires no network request. Keep the ranking table and club result filters as client components whose `gender` state is reflected in the URL, while server repositories continue to validate all Supabase JSON before it reaches the browser.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres, Vitest, Testing Library, CSS transitions.

## Global Constraints

- Ranking points, ranking order, tournament weights, and source results must not change.
- Best results use every verified 16강-or-better result across all recorded years.
- Best-result order is stage, tournament prestige, newer year, larger field, then stable source order.
- Only 2025 champion, runner-up, and semifinal results display crown images.
- Only one national ranking row may be expanded at once.
- Division state uses `gender=men|women|combined` and must survive detail navigation and browser Back.
- Direct club result URLs without a valid division default to `combined`; the national ranking defaults to `men`.
- No new runtime dependency is permitted.
- Every behavior change follows red-green TDD.

---

### Task 1: Derive Podium Honors and All-Time Best Results

**Files:**
- Modify: `lib/nationalRanking/types.ts`
- Modify: `lib/nationalRanking/calculate.ts`
- Test: `lib/nationalRanking/calculate.test.ts`
- Test: `lib/nationalRanking/seedPlan.test.ts`

**Interfaces:**
- Produces: `NationalRankingBestResult`, semifinal-capable `NationalRankingHonor`, and `CalculatedRankingRow.bestResults`.
- Consumes: the validated `NationalRankingDataset` and fixed formula-v3 tournament units.

- [ ] **Step 1: Write failing calculation tests**

Add fixtures that include duplicate teams in one edition, an expired old champion, 2025 semifinalists, and both divisions. Assert the exact shape and order:

```ts
expect(alphaMen?.bestResults.map((result) => [
  result.stage,
  result.tournamentSlug,
  result.year,
])).toEqual([
  ["champion", "yanggu", 2022],
  ["runner_up", "chuncheon", 2025],
  ["semifinal", "gyeongin", 2025],
]);

expect(alphaMen?.honors).toContainEqual(
  expect.objectContaining({ year: 2025, stage: "semifinal" })
);
expect(alphaCombined?.bestResults).toHaveLength(3);
```

Also assert that two source teams in the same club, edition, and division contribute only the stronger result to `bestResults`.

- [ ] **Step 2: Run tests and confirm the red state**

Run:

```bash
npm test -- lib/nationalRanking/calculate.test.ts lib/nationalRanking/seedPlan.test.ts
```

Expected: TypeScript or assertions fail because `bestResults` does not exist and semifinal is not a valid honor stage.

- [ ] **Step 3: Add the exact public types**

Add to `types.ts`:

```ts
export type PublicTournamentResultStage = Extract<
  TournamentStage,
  "champion" | "runner_up" | "semifinal" | "quarterfinal" | "round_of_16"
>;

export type NationalRankingBestResult = {
  editionKey: string;
  tournamentSlug: string;
  tournamentName: string;
  year: number;
  gender: NationalGender;
  actualEntrants: number;
  stage: PublicTournamentResultStage;
  sourceTeamName: string;
};
```

Change `NationalRankingHonor.stage` to:

```ts
stage: Extract<TournamentStage, "champion" | "runner_up" | "semifinal">;
```

Add `bestResults: NationalRankingBestResult[]` to `CalculatedRankingRow`.

- [ ] **Step 4: Implement deterministic all-time selection**

In `calculate.ts`, build one best result per `(clubSlug, gender, tournamentSlug, year)` from verified top-16 results whose edition is verified. Sort the deduplicated values using this exact stage order:

```ts
const BEST_RESULT_STAGE_ORDER = {
  champion: 0,
  runner_up: 1,
  semifinal: 2,
  quarterfinal: 3,
  round_of_16: 4,
} as const;
```

Then compare tournament units descending with `NATIONAL_FORMULA_V3`, year descending, `actualEntrants` descending, dataset tournament order, and `sourceTeamName.localeCompare(..., "ko-KR")`. Slice each gender list to three and combine men's and women's lists through the same comparator for `combined`.

Extend the honor collector condition to:

```ts
if (
  result.clubSlug === null ||
  !["champion", "runner_up", "semifinal"].includes(result.stage ?? "")
) {
  continue;
}
```

Update honor sorting to use the same podium order rather than a champion/runner-up binary branch.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npm test -- lib/nationalRanking/calculate.test.ts lib/nationalRanking/seedPlan.test.ts
```

Expected: both files pass.

Commit:

```bash
git add lib/nationalRanking/types.ts lib/nationalRanking/calculate.ts lib/nationalRanking/calculate.test.ts lib/nationalRanking/seedPlan.test.ts
git commit -m "feat: derive clubs' best historical results"
```

---

### Task 2: Persist and Validate Best Results in Supabase Snapshots

**Files:**
- Create: `supabase/migrations/20260714032041_add_national_ranking_best_results.sql`
- Modify: `supabase/migrations/nationalRankingMigrations.test.ts`
- Modify: `lib/nationalRanking/seedSql.ts`
- Modify: `lib/nationalRanking/seedSql.test.ts`
- Modify: `lib/nationalRanking/repository.ts`
- Modify: `lib/nationalRanking/repository.test.ts`

**Interfaces:**
- Consumes: `CalculatedRankingRow.bestResults` from Task 1.
- Produces: `PublicNationalRankingRow.bestResults: NationalRankingBestResult[]` from one `latest_national_rankings` query.

- [ ] **Step 1: Check current Supabase CLI and generate the migration path**

Run as separate commands:

```bash
npx supabase --version
npx supabase migration new add_national_ranking_best_results
```

Use the generated filename; do not invent a timestamp.

- [ ] **Step 2: Write failing migration, seed, and repository tests**

Assert the migration contains:

```sql
add column if not exists best_results jsonb not null default '[]'::jsonb
check (jsonb_typeof(best_results) = 'array')
create or replace view public.latest_national_rankings
with (security_invoker = true)
```

Assert seed SQL includes `best_results` in row input, insert, immutable comparison, and snapshot records. Add repository fixtures with one valid best result and assertions that malformed stage, year, gender, entrants, and non-array data throw a club-specific error.

- [ ] **Step 3: Run tests and confirm the red state**

Run:

```bash
npm test -- supabase/migrations/nationalRankingMigrations.test.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/repository.test.ts
```

Expected: failures identify the missing migration column, SQL field, select field, and parser.

- [ ] **Step 4: Implement the migration and seed contract**

The migration adds `best_results`, its array check, and recreates `latest_national_rankings` with all existing columns plus:

```sql
ranking_row.best_results,
ranking_row.honors
```

Retain the existing revokes and grants for `anon` and `service_role`.

Update `seedSql.ts` so `RankingRowRecord`, `rowInputCte`, the ranking-row insert, and immutable snapshot comparison all serialize `row.bestResults` as `best_results`.

- [ ] **Step 5: Implement repository parsing**

Add `best_results: unknown` to `NationalRankingViewRow`, select it from the view, add `bestResults` to `PublicNationalRankingRow`, and parse every field into `NationalRankingBestResult`. Accept only the five public stages and reject missing or invalid data with errors prefixed `National ranking best results`.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
npm test -- supabase/migrations/nationalRankingMigrations.test.ts lib/nationalRanking/seedSql.test.ts lib/nationalRanking/repository.test.ts
```

Expected: all three files pass.

Commit the generated migration and five changed files:

```bash
git commit -m "feat: publish best results with ranking snapshots"
```

---

### Task 3: Add a Shared Bronze-Capable Crown Renderer

**Files:**
- Create: `public/national-ranking/bronze-crown.png`
- Create: `app/NationalPodiumCrown.tsx`
- Create: `app/NationalPodiumCrown.test.tsx`
- Modify: `app/NationalRankingHonor.tsx`
- Modify: `app/NationalRankingHonor.test.tsx`
- Modify: `app/globals.css`
- Test: `app/globals.test.ts`

**Interfaces:**
- Consumes: podium stages from `NationalRankingHonor` and `NationalRankingBestResult`.
- Produces: `NationalPodiumCrown({ stage, decorative, className })` and a semifinal-aware interactive ranking honor.

- [ ] **Step 1: Copy and verify the supplied asset**

Copy `/Users/parkjinhong/Downloads/bronze crown.png` to `public/national-ranking/bronze-crown.png`. Verify all three crown files are readable PNG files with `sips -g pixelWidth -g pixelHeight`.

- [ ] **Step 2: Write failing component tests**

Assert `NationalPodiumCrown` maps stages exactly:

```ts
expect(crownSource("champion")).toContain("gold-crown.png");
expect(crownSource("runner_up")).toContain("silver-crown.png");
expect(crownSource("semifinal")).toContain("bronze-crown.png");
```

Extend `NationalRankingHonor.test.tsx` to expect the accessible label `2025 양구 남자부 4강`, bronze image source, mobile click toggle, desktop hover CSS contract, and no regression for gold/silver.

- [ ] **Step 3: Run tests and confirm the red state**

Run:

```bash
npm test -- app/NationalPodiumCrown.test.tsx app/NationalRankingHonor.test.tsx app/globals.test.ts
```

Expected: the new component is missing and semifinal falls through to silver.

- [ ] **Step 4: Implement the shared renderer and styling**

`NationalPodiumCrown` chooses from this frozen map:

```ts
const crownByStage = {
  champion: { alt: "우승", src: "/national-ranking/gold-crown.png" },
  runner_up: { alt: "준우승", src: "/national-ranking/silver-crown.png" },
  semifinal: { alt: "4강", src: "/national-ranking/bronze-crown.png" },
} as const;
```

Use it inside `NationalRankingHonor`, change `getHonorLabel` to a three-stage map, and keep the existing hover/tap tooltip. Add `.national-result-crown` sizing for the later compact result lists without increasing row height.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npm test -- app/NationalPodiumCrown.test.tsx app/NationalRankingHonor.test.tsx app/globals.test.ts
```

Expected: all focused tests pass.

Commit:

```bash
git add public/national-ranking/bronze-crown.png app/NationalPodiumCrown.tsx app/NationalPodiumCrown.test.tsx app/NationalRankingHonor.tsx app/NationalRankingHonor.test.tsx app/globals.css app/globals.test.ts
git commit -m "feat: add bronze podium crowns"
```

---

### Task 4: Build the One-Open Ranking Accordion and Preserve Division URLs

**Files:**
- Create: `lib/nationalRanking/genderQuery.ts`
- Create: `lib/nationalRanking/genderQuery.test.ts`
- Create: `app/NationalRankingExpandedResults.tsx`
- Create: `app/NationalRankingExpandedResults.test.tsx`
- Modify: `app/NationalRankingTable.tsx`
- Modify: `app/NationalRankingTable.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: `PublicNationalRankingRow.bestResults` and the shared crown renderer.
- Produces: `parseRankingGender(value, fallback)`, a URL-synchronized ranking tab, and one-open disclosure rows.

- [ ] **Step 1: Write failing pure and component tests**

Test `parseRankingGender` with all valid values and invalid/null fallbacks. Mock `next/navigation` for the ranking table and assert:

```ts
fireEvent.click(screen.getByRole("button", {
  name: "서울과학기술대학교 STC 최고 성적 펼치기",
}));
expect(screen.getByRole("region", {
  name: "서울과학기술대학교 STC 최고 성적",
})).toBeDefined();

fireEvent.click(screen.getByRole("button", {
  name: "한국과학기술원 KAIST Tennis 최고 성적 펼치기",
}));
expect(screen.queryByRole("region", {
  name: "서울과학기술대학교 STC 최고 성적",
})).toBeNull();
```

Assert the expanded list has at most three records, a 2025 podium crown but no crown for an older podium, and an `전체 성적 보기` href ending in `?gender=men`. Assert a women-tab click calls `router.replace("/?gender=women", { scroll: false })` and closes the expansion.

- [ ] **Step 2: Run tests and confirm the red state**

Run:

```bash
npm test -- lib/nationalRanking/genderQuery.test.ts app/NationalRankingExpandedResults.test.tsx app/NationalRankingTable.test.tsx app/globals.test.ts
```

Expected: new files and disclosure controls are missing.

- [ ] **Step 3: Implement URL state and disclosure behavior**

Implement:

```ts
export function parseRankingGender(
  value: string | null | undefined,
  fallback: RankingGender
): RankingGender {
  return value === "men" || value === "women" || value === "combined"
    ? value
    : fallback;
}
```

In `NationalRankingTable`, read `useSearchParams()`, default to `men`, maintain `expandedClubSlug: string | null`, close it on tab change, and update the URL with `useRouter().replace`. Render each main row and its detail row in a keyed fragment.

`NationalRankingExpandedResults` renders up to three pre-sorted records, uses a crown only when `year === 2025` and stage is podium, and links to `/clubs/${clubSlug}?gender=${activeGender}`.

- [ ] **Step 4: Implement the animation and focus contracts**

Use a detail cell with zero padding and a nested grid wrapper:

```css
.national-ranking-expansion {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 180ms ease, opacity 140ms ease;
}

.national-ranking-detail-row[data-open="true"] .national-ranking-expansion {
  grid-template-rows: 1fr;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .national-ranking-expansion { transition: none; }
}
```

Keep the disclosure button's absolute cell-wide hit area below the separately interactive crown buttons. Add `aria-expanded`, `aria-controls`, and a labelled detail `region`.

- [ ] **Step 5: Add the static-render Suspense boundary**

Wrap `NationalRankingTable` in `<Suspense>` in `page.tsx` because the client component reads `useSearchParams`. The fallback renders the same table component with server-provided rows only if the build contract permits it; otherwise use a fixed-height quiet loading surface so prerendering remains static.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
npm test -- lib/nationalRanking/genderQuery.test.ts app/NationalRankingExpandedResults.test.tsx app/NationalRankingTable.test.tsx app/page.test.tsx app/globals.test.ts
```

Expected: all focused tests pass.

Commit:

```bash
git add lib/nationalRanking/genderQuery.ts lib/nationalRanking/genderQuery.test.ts app/NationalRankingExpandedResults.tsx app/NationalRankingExpandedResults.test.tsx app/NationalRankingTable.tsx app/NationalRankingTable.test.tsx app/page.tsx app/globals.css app/globals.test.ts
git commit -m "feat: expand national ranking results inline"
```

---

### Task 5: Add Division Tabs and Crowns to the Complete Results Page

**Files:**
- Create: `app/clubs/[clubSlug]/NationalClubResultsView.tsx`
- Create: `app/clubs/[clubSlug]/NationalClubResultsView.test.tsx`
- Modify: `app/clubs/[clubSlug]/page.tsx`
- Modify: `app/clubs/[clubSlug]/page.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: `NationalClubResultsPageData`, `parseRankingGender`, and `NationalPodiumCrown`.
- Produces: a client-filtered result list whose active division and back link are URL synchronized.

- [ ] **Step 1: Write failing page and client-view tests**

Create mixed men's/women's fixtures including 2025 champion, runner-up, semifinal, and a 2024 champion. Assert:

- `?gender=women` selects 여자부 and hides men's records.
- `combined` shows both divisions.
- the count is scoped to the active tab.
- only the three 2025 podium rows contain crown images.
- the current back link is `/?gender=women` after selecting women.
- selecting men calls `router.replace("/clubs/seoultech-neutinamu?gender=men", { scroll: false })`.

- [ ] **Step 2: Run tests and confirm the red state**

Run:

```bash
npm test -- 'app/clubs/[clubSlug]/NationalClubResultsView.test.tsx' 'app/clubs/[clubSlug]/page.test.tsx' app/globals.test.ts
```

Expected: the client view and tabs are missing.

- [ ] **Step 3: Implement the client result view**

Move the back link, tabs, active record count, empty state, and result list into `NationalClubResultsView`. Default invalid or missing detail queries to `combined`. Filter with:

```ts
const visibleResults =
  activeGender === "combined"
    ? pageData.results
    : pageData.results.filter((result) => result.gender === activeGender);
```

Retain chronological repository order. Render `NationalPodiumCrown` before the edition block only when `result.year === 2025` and the stage is champion, runner-up, or semifinal.

- [ ] **Step 4: Implement responsive tabs and result-row alignment**

Reuse the national ranking underline-tab visual language. Add a narrow crown column that collapses to an empty fixed-width spacer for non-podium records, keeping year, competition, and stage columns aligned on mobile and desktop.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npm test -- 'app/clubs/[clubSlug]/NationalClubResultsView.test.tsx' 'app/clubs/[clubSlug]/page.test.tsx' app/globals.test.ts
```

Expected: all focused tests pass.

Commit:

```bash
git add 'app/clubs/[clubSlug]/NationalClubResultsView.tsx' 'app/clubs/[clubSlug]/NationalClubResultsView.test.tsx' 'app/clubs/[clubSlug]/page.tsx' 'app/clubs/[clubSlug]/page.test.tsx' app/globals.css app/globals.test.ts
git commit -m "feat: filter club results by ranking division"
```

---

### Task 6: Apply the Supabase Contract and Publish a Fresh Snapshot

**Files:**
- Read: generated migration from Task 2
- Generate temporarily: `/tmp/national-ranking-seed.sql`

**Interfaces:**
- Consumes: the migration, seed generator, and connected Supabase project.
- Produces: production `best_results`, semifinal honors, and a newly published immutable snapshot.

- [ ] **Step 1: Verify current Supabase guidance**

Fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, and use Supabase `search_docs` for security-invoker views and JSONB constraints. Do not alter the established RLS/grant model.

- [ ] **Step 2: Discover the connected project and inspect migration state**

Use Supabase MCP `list_projects`, select the existing Korea Tennis Ranking project, and run `list_migrations`. Confirm the latest remote migration matches the repository before applying a new one.

- [ ] **Step 3: Apply the generated DDL migration**

Use Supabase MCP `apply_migration` with the generated migration name and exact file contents. Then run a read-only SQL query confirming `best_results` exists on `national_ranking_rows` and the public view exposes it.

- [ ] **Step 4: Generate and execute the immutable snapshot SQL**

Run:

```bash
npm run seed:national:sql -- --out /tmp/national-ranking-seed.sql
```

Review the generated source revision and execute the file contents through Supabase MCP `execute_sql`. Do not commit the temporary SQL file.

- [ ] **Step 5: Verify production data and advisors**

Run read-only validation queries that assert:

```sql
select
  gender,
  count(*) as rows,
  bool_and(jsonb_typeof(best_results) = 'array') as arrays_only,
  bool_and(jsonb_array_length(best_results) <= 3) as max_three
from public.latest_national_rankings
group by gender;
```

Also query 2025 semifinal honors and confirm at least one published row contains `stage = 'semifinal'`. Run Supabase security and performance advisors and report any new issue related to this migration.

---

### Task 7: Full Verification, Browser QA, and Push

**Files:**
- Verify: all changed source, tests, migration, docs, and assets.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: verified production-ready code on `main` and a clean working tree.

- [ ] **Step 1: Run the complete automated suite**

Run as separate commands:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. Record the exact test count and any unrelated existing warnings.

- [ ] **Step 2: Start the local app for visual QA**

Run `npm run dev -- --port 3020`. Use the in-app browser rather than a standalone browser automation process.

- [ ] **Step 3: Verify desktop behavior**

At a normal desktop viewport, confirm:

- gold, silver, and bronze 2025 crowns stay aligned in one row;
- clicking a club cell opens three or fewer historical results;
- clicking another club closes the first;
- crown hover does not toggle the row;
- `전체 성적 보기` opens the active division;
- detail tabs, counts, crowns, and explicit back link are correct.

- [ ] **Step 4: Verify mobile and browser Back**

At `390x844`, repeat the accordion flow, tap crown tooltips, open a women's detail page, and use browser Back. Confirm the main page returns with 여자부 selected and no horizontal overflow or text overlap.

- [ ] **Step 5: Commit any QA-only fixes through their own red-green cycle**

If browser QA reveals a defect, add the narrowest failing test, implement the fix, rerun the focused test, then rerun the complete verification commands.

- [ ] **Step 6: Push and confirm repository state**

Push `main`, then run:

```bash
git status --short
```

Expected: push succeeds and status output is empty.
