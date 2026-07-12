# National University Tennis Club Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root placeholder with fast, auditable men's, women's, and combined university tennis club rankings calculated from the verified tournament sources in `~/Documents/테니스 랭킹`.

**Architecture:** Normalize the 26 competition-edition-gender source sets into one versioned JSON dataset, calculate scores with a pure TypeScript engine, and publish an immutable Supabase snapshot. The root server component reads one public latest-snapshot view, while small client components provide gender tabs and the methodology popover; `/methodology` remains static and shareable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest, Testing Library, Supabase Postgres/RLS, `@supabase/supabase-js`, `lucide-react`.

## Global Constraints

- Formula version is exactly `national-club-v1`.
- Included competitions are 국토정중앙배(양구), 경인지구 연맹전, 하늘내린인제, 춘천소양강배, and WEMIX OPEN.
- 영월 is excluded.
- Men's and women's rankings are independent primary outputs; combined ranking is secondary and equals men's points plus women's points.
- Within one club, gender, competition, and edition, only the best A/B/C team result scores.
- Stage points are `100, 65, 40, 20, 10, 5, 2.5, 0` for champion through first-played-match loss.
- Competition scope factors are `1.00` for the four national competitions and `0.85` for 경인지구.
- Field factor is `clamp(0.85, 1.20, 1 + 0.10 * log2(actualEntrants / 32))`.
- Edition factors are `1.00`, `0.60`, `0.36`, then `0`, evaluated independently per competition.
- Scores retain JavaScript/Postgres numeric precision and are rounded only for display.
- `unresolved` and `missing` results never score and are never inferred.
- WEMIX 2023/2024 do not exist and must not be represented as zero-point editions.
- Every behavior change is developed test-first.
- Do not expose Supabase service-role credentials or raw unresolved result data to the browser.
- Keep the existing `/seoultech`, `/petc`, and `/admin` behavior unchanged.

---

## File Structure

### Domain and source data

- Create `lib/nationalRanking/types.ts`: shared domain contracts.
- Create `lib/nationalRanking/formula.ts`: versioned formula constants and scalar factor functions.
- Create `lib/nationalRanking/calculate.ts`: best-team aggregation, score totals, combined rows, and tie-breaking.
- Create `lib/nationalRanking/dataset.ts`: runtime validation and loading of the committed source manifest.
- Create `data/national-ranking/v1/dataset.json`: canonical source manifest, relative source references, club aliases, editions, and team results.
- Create `data/national-ranking/v1/README.md`: extraction conventions and unresolved mapping log.

### Persistence and publication

- Create `supabase/migrations/20260712120000_create_national_rankings.sql`: normalized source tables, immutable snapshots, RLS, indexes, and latest public view.
- Create `supabase/migrations/nationalRankingMigrations.test.ts`: migration contract tests.
- Create `lib/nationalRanking/seedPlan.ts`: turn the validated dataset and calculated rows into persistence records.
- Create `lib/nationalRanking/seedSql.ts`: generate one idempotent SQL transaction.
- Create `scripts/build-national-ranking-seed-sql.ts`: CLI that hashes the source manifest and writes/prints seed SQL.
- Modify `package.json`: add `seed:national:sql`.

### Public read path and UI

- Create `lib/nationalRanking/repository.ts`: read and group the latest published Supabase view.
- Create `app/NationalRankingTable.tsx`: accessible men/women/combined segmented ranking table.
- Create `app/RankingMethodologyInfo.tsx`: `Info` icon, desktop popover, mobile bottom sheet, and detail link.
- Modify `app/page.tsx`: render the real national ranking as the first screen.
- Create `app/methodology/page.tsx`: complete public formula explanation.
- Modify `app/globals.css`: national ranking and methodology responsive styles.
- Modify `app/globals.test.ts`: stable layout assertions for critical responsive rules.

---

### Task 1: Add the versioned scoring primitives

**Files:**
- Create: `lib/nationalRanking/types.ts`
- Create: `lib/nationalRanking/formula.ts`
- Test: `lib/nationalRanking/formula.test.ts`

**Interfaces:**
- Produces: `NATIONAL_FORMULA_V1`, `getStagePoints(stage)`, `getFieldSizeFactor(actualEntrants)`, `getRecencyFactor(latestYear, resultYear)`, and `scoreVerifiedResult(input)`.
- Consumes: no project modules.

- [ ] **Step 1: Write the failing formula tests**

```ts
import { describe, expect, it } from "vitest";

import {
  getFieldSizeFactor,
  getRecencyFactor,
  getStagePoints,
  scoreVerifiedResult,
} from "@/lib/nationalRanking/formula";

describe("national ranking formula v1", () => {
  it("uses the approved ATP-shaped stage curve", () => {
    expect(getStagePoints("champion")).toBe(100);
    expect(getStagePoints("runner_up")).toBe(65);
    expect(getStagePoints("semifinal")).toBe(40);
    expect(getStagePoints("quarterfinal")).toBe(20);
    expect(getStagePoints("round_of_16")).toBe(10);
    expect(getStagePoints("round_of_32")).toBe(5);
    expect(getStagePoints("round_of_64")).toBe(2.5);
    expect(getStagePoints("first_match_loss")).toBe(0);
  });

  it("applies the logarithmic field factor and clamps its range", () => {
    expect(getFieldSizeFactor(16)).toBeCloseTo(0.9);
    expect(getFieldSizeFactor(32)).toBeCloseTo(1);
    expect(getFieldSizeFactor(64)).toBeCloseTo(1.1);
    expect(getFieldSizeFactor(128)).toBeCloseTo(1.2);
    expect(getFieldSizeFactor(4)).toBe(0.85);
    expect(getFieldSizeFactor(512)).toBe(1.2);
  });

  it("keeps only the latest three edition years", () => {
    expect(getRecencyFactor(2025, 2025)).toBe(1);
    expect(getRecencyFactor(2025, 2024)).toBeCloseTo(0.6);
    expect(getRecencyFactor(2025, 2023)).toBeCloseTo(0.36);
    expect(getRecencyFactor(2025, 2022)).toBe(0);
  });

  it("multiplies every approved factor", () => {
    expect(
      scoreVerifiedResult({
        stage: "champion",
        scopeFactor: 1,
        actualEntrants: 64,
        latestEditionYear: 2025,
        editionYear: 2024,
      })
    ).toBeCloseTo(66);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- lib/nationalRanking/formula.test.ts`  
Expected: FAIL because `@/lib/nationalRanking/formula` does not exist.

- [ ] **Step 3: Define the shared domain types**

```ts
// lib/nationalRanking/types.ts
export type NationalGender = "men" | "women";
export type RankingGender = NationalGender | "combined";

export type TournamentStage =
  | "champion"
  | "runner_up"
  | "semifinal"
  | "quarterfinal"
  | "round_of_16"
  | "round_of_32"
  | "round_of_64"
  | "first_match_loss";

export type ResultQualityStatus =
  | "verified"
  | "unresolved"
  | "missing"
  | "did_not_enter";

export type FormulaInput = {
  stage: TournamentStage;
  scopeFactor: number;
  actualEntrants: number;
  latestEditionYear: number;
  editionYear: number;
};
```

- [ ] **Step 4: Implement the minimum formula module**

```ts
// lib/nationalRanking/formula.ts
import type { FormulaInput, TournamentStage } from "./types";

export const NATIONAL_FORMULA_V1 = {
  version: "national-club-v1",
  stagePoints: {
    champion: 100,
    runner_up: 65,
    semifinal: 40,
    quarterfinal: 20,
    round_of_16: 10,
    round_of_32: 5,
    round_of_64: 2.5,
    first_match_loss: 0,
  },
  field: { minimum: 0.85, maximum: 1.2, baseline: 32, step: 0.1 },
  recencyRetention: 0.6,
  eligibleEditionSpan: 3,
} as const;

export function getStagePoints(stage: TournamentStage): number {
  return NATIONAL_FORMULA_V1.stagePoints[stage];
}

export function getFieldSizeFactor(actualEntrants: number): number {
  if (!Number.isInteger(actualEntrants) || actualEntrants <= 0) {
    throw new Error("actualEntrants must be a positive integer");
  }

  const raw =
    1 +
    NATIONAL_FORMULA_V1.field.step *
      Math.log2(actualEntrants / NATIONAL_FORMULA_V1.field.baseline);

  return Math.min(
    NATIONAL_FORMULA_V1.field.maximum,
    Math.max(NATIONAL_FORMULA_V1.field.minimum, raw)
  );
}

export function getRecencyFactor(
  latestEditionYear: number,
  editionYear: number
): number {
  const age = latestEditionYear - editionYear;

  if (age < 0) throw new Error("editionYear cannot follow latestEditionYear");
  if (age >= NATIONAL_FORMULA_V1.eligibleEditionSpan) return 0;

  return NATIONAL_FORMULA_V1.recencyRetention ** age;
}

export function scoreVerifiedResult(input: FormulaInput): number {
  return (
    getStagePoints(input.stage) *
    input.scopeFactor *
    getFieldSizeFactor(input.actualEntrants) *
    getRecencyFactor(input.latestEditionYear, input.editionYear)
  );
}
```

- [ ] **Step 5: Run the formula tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/formula.test.ts`  
Expected: 4 tests pass.

- [ ] **Step 6: Commit the scoring primitives**

```bash
git add lib/nationalRanking/types.ts lib/nationalRanking/formula.ts lib/nationalRanking/formula.test.ts
git commit -m "feat: add national ranking formula"
```

---

### Task 2: Calculate club rankings with best-team aggregation

**Files:**
- Modify: `lib/nationalRanking/types.ts`
- Create: `lib/nationalRanking/calculate.ts`
- Test: `lib/nationalRanking/calculate.test.ts`

**Interfaces:**
- Consumes: `scoreVerifiedResult()` and `NATIONAL_FORMULA_V1` from Task 1.
- Produces: `calculateNationalRankings(dataset): CalculatedNationalRanking`.

- [ ] **Step 1: Extend the domain contracts**

```ts
export type NationalClubInput = {
  slug: string;
  universityName: string;
  clubName: string;
  displayName: string;
};

export type NationalClubAliasInput = {
  clubSlug: string;
  normalizedAlias: string;
  sourceLabel: string;
};

export type TournamentInput = {
  slug: string;
  name: string;
  scope: "national" | "regional";
  scopeFactor: number;
};

export type TournamentEditionInput = {
  key: string;
  tournamentSlug: string;
  year: number;
  gender: NationalGender;
  actualEntrants: number;
  sourceStatus: "verified" | "unresolved" | "missing";
  sourceRefs: string[];
};

export type TeamResultInput = {
  editionKey: string;
  clubSlug: string | null;
  sourceTeamName: string;
  teamLabel: string;
  stage: TournamentStage;
  qualityStatus: ResultQualityStatus;
  sourceRef: string;
  note: string;
};

export type NationalRankingDataset = {
  version: string;
  clubs: NationalClubInput[];
  aliases: NationalClubAliasInput[];
  tournaments: TournamentInput[];
  editions: TournamentEditionInput[];
  results: TeamResultInput[];
};

export type ScoreContribution = FormulaInput & {
  clubSlug: string;
  gender: NationalGender;
  tournamentSlug: string;
  editionKey: string;
  sourceTeamName: string;
  points: number;
};

export type CalculatedRankingRow = {
  clubSlug: string;
  gender: RankingGender;
  rank: number;
  totalPoints: number;
  latestEditionPoints: number;
  maxContribution: number;
  championships: number;
  runnerUps: number;
  contributions: ScoreContribution[];
};

export type CalculatedNationalRanking = {
  formulaVersion: "national-club-v1";
  rows: CalculatedRankingRow[];
};
```

- [ ] **Step 2: Write failing aggregation tests**

Use a fixture containing two clubs, both genders, a national event, a regional
event, A/B teams, and one unresolved result. Assert:

```ts
const result = calculateNationalRankings(dataset);
const alphaMen = result.rows.find(
  (row) => row.clubSlug === "alpha" && row.gender === "men"
);

expect(alphaMen?.contributions).toHaveLength(2);
expect(alphaMen?.championships).toBe(1);
expect(alphaMen?.contributions.some((item) => item.sourceTeamName === "Alpha B")).toBe(false);
expect(result.rows.some((row) => row.clubSlug === "unmapped")).toBe(false);
expect(result.rows.filter((row) => row.gender === "combined")).toHaveLength(2);
```

Add a tie fixture and assert the order is total points, latest-edition points,
largest single contribution, championships, runner-ups, then Korean display
name.

- [ ] **Step 3: Run the tests and verify RED**

Run: `npm test -- lib/nationalRanking/calculate.test.ts`  
Expected: FAIL because `calculateNationalRankings` does not exist.

- [ ] **Step 4: Implement the calculator**

Implement these explicit phases in `calculate.ts`:

```ts
export function calculateNationalRankings(
  dataset: NationalRankingDataset
): CalculatedNationalRanking {
  const latestYear = new Map<string, number>();
  for (const edition of dataset.editions) {
    latestYear.set(
      edition.tournamentSlug,
      Math.max(latestYear.get(edition.tournamentSlug) ?? 0, edition.year)
    );
  }

  // 1. Join only verified results to verified editions, known clubs, and tournaments.
  // 2. Score each joined result with scoreVerifiedResult().
  // 3. Group by clubSlug/gender/tournamentSlug/year and retain the highest points.
  // 4. Sum best-team contributions into men's and women's rows.
  // 5. Create combined rows by adding the two gender rows for each club.
  // 6. Sort each gender with the approved tie-breaker and assign rank index + 1.
  return { formulaVersion: NATIONAL_FORMULA_V1.version, rows };
}
```

Use explicit lookup maps and throw a source-qualified error when a verified
result references an unknown edition, tournament, or club. Do not silently skip
malformed verified records.

- [ ] **Step 5: Run aggregation tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/formula.test.ts lib/nationalRanking/calculate.test.ts`  
Expected: all formula and calculator tests pass.

- [ ] **Step 6: Commit the ranking engine**

```bash
git add lib/nationalRanking/types.ts lib/nationalRanking/calculate.ts lib/nationalRanking/calculate.test.ts
git commit -m "feat: calculate national club rankings"
```

---

### Task 3: Validate the versioned tournament source manifest

**Files:**
- Create: `lib/nationalRanking/dataset.ts`
- Test: `lib/nationalRanking/dataset.test.ts`

**Interfaces:**
- Consumes: `NationalRankingDataset` from Task 2.
- Produces: `parseNationalRankingDataset(value)` and `loadNationalRankingDataset()`.

- [ ] **Step 1: Write failing validation tests**

Cover valid input and each rejected invariant:

```ts
expect(() => parseNationalRankingDataset(validDataset)).not.toThrow();
expect(() => parseNationalRankingDataset({ ...validDataset, version: "" }))
  .toThrow("dataset.version must be a non-empty string");
expect(() => parseNationalRankingDataset(duplicateEditionDataset))
  .toThrow("duplicate edition key");
expect(() => parseNationalRankingDataset(verifiedUnknownClubDataset))
  .toThrow("verified result must reference a known club");
expect(() => parseNationalRankingDataset(verifiedUnknownEditionDataset))
  .toThrow("result references an unknown edition");
expect(() => parseNationalRankingDataset(invalidEntrantCountDataset))
  .toThrow("actualEntrants must be a positive integer");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/nationalRanking/dataset.test.ts`  
Expected: FAIL because `dataset.ts` does not exist.

- [ ] **Step 3: Implement runtime validation without adding a schema dependency**

Use small helpers such as:

```ts
function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}
```

Validate all union values, unique natural keys, alias-to-club references,
source references, the verified-club rule, and a scope factor of exactly
`0.85` or `1.00`. Return a new typed object instead of casting the source
value.

The exported signature is:

```ts
export function parseNationalRankingDataset(
  value: unknown
): NationalRankingDataset;
```

- [ ] **Step 4: Run validation tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/dataset.test.ts`  
Expected: all validation tests pass.

- [ ] **Step 5: Commit the validator**

```bash
git add lib/nationalRanking/dataset.ts lib/nationalRanking/dataset.test.ts
git commit -m "feat: validate national ranking sources"
```

---

### Task 4: Normalize Yanggu and Inje source results

**Files:**
- Create: `data/national-ranking/v1/dataset.json`
- Create: `data/national-ranking/v1/README.md`
- Modify: `lib/nationalRanking/dataset.ts`
- Modify: `lib/nationalRanking/dataset.test.ts`

**Interfaces:**
- Consumes: source files under `~/Documents/테니스 랭킹/양구` and `~/Documents/테니스 랭킹/인제`.
- Produces: 12 validated edition records and their verified/unresolved team results.

- [ ] **Step 1: Add a failing real-manifest test**

```ts
const dataset = loadNationalRankingDataset();
const selected = dataset.editions.filter((edition) =>
  ["yanggu", "inje"].includes(edition.tournamentSlug)
);

expect(selected).toHaveLength(12);
expect(new Set(selected.map((edition) => edition.gender))).toEqual(
  new Set(["men", "women"])
);
expect(selected.every((edition) => edition.sourceRefs.length > 0)).toBe(true);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- lib/nationalRanking/dataset.test.ts`  
Expected: FAIL because the committed manifest does not exist.

- [ ] **Step 3: Create the canonical manifest header**

The root structure must be:

```json
{
  "version": "sources-2026-07-12-v1",
  "clubs": [],
  "aliases": [],
  "tournaments": [
    { "slug": "yanggu", "name": "국토정중앙배(양구)", "scope": "national", "scopeFactor": 1 },
    { "slug": "gyeongin", "name": "경인지구 연맹전", "scope": "regional", "scopeFactor": 0.85 },
    { "slug": "inje", "name": "하늘내린인제", "scope": "national", "scopeFactor": 1 },
    { "slug": "chuncheon", "name": "춘천소양강배", "scope": "national", "scopeFactor": 1 },
    { "slug": "wemix", "name": "WEMIX OPEN", "scope": "national", "scopeFactor": 1 }
  ],
  "editions": [],
  "results": []
}
```

- [ ] **Step 4: Transcribe all six Yanggu and six Inje editions**

For each 2023, 2024, and 2025 men's and women's source set:

1. Count actual named entrants and exclude `Bye`.
2. Record every team with a verifiable scoring stage from champion through
   round of 64.
3. Store source paths relative to `~/Documents/테니스 랭킹`, never absolute
   machine paths.
4. Map aliases to canonical club slugs only when the source identifies the
   club.
5. Store ambiguous university-only labels with `clubSlug: null` and
   `qualityStatus: "unresolved"`.
6. Give a first-played-match loser the explicit stage `first_match_loss`.

Example verified row:

```json
{
  "editionKey": "yanggu-2025-men",
  "clubSlug": "korea-kutc",
  "sourceTeamName": "고려대 KUTC A",
  "teamLabel": "A",
  "stage": "semifinal",
  "qualityStatus": "verified",
  "sourceRef": "양구/2025/남자/2025 양구 남자.pdf#page=3",
  "note": ""
}
```

- [ ] **Step 5: Document extraction conventions**

`README.md` must state the 26 expected edition/gender units, source-root
location, alias policy, BYE policy, WEMIX exception, and the rule that no OCR
output becomes `verified` without visual confirmation.

- [ ] **Step 6: Load the JSON through the validator**

```ts
import sourceDataset from "@/data/national-ranking/v1/dataset.json";

export function loadNationalRankingDataset(): NationalRankingDataset {
  return parseNationalRankingDataset(sourceDataset);
}
```

- [ ] **Step 7: Run data and calculator tests**

Run: `npm test -- lib/nationalRanking/dataset.test.ts lib/nationalRanking/calculate.test.ts`  
Expected: all tests pass and 12 Yanggu/Inje editions validate.

- [ ] **Step 8: Commit the first verified data tranche**

```bash
git add data/national-ranking/v1 lib/nationalRanking/dataset.ts lib/nationalRanking/dataset.test.ts
git commit -m "data: normalize Yanggu and Inje results"
```

---

### Task 5: Complete Gyeongin, Chuncheon, and WEMIX normalization

**Files:**
- Modify: `data/national-ranking/v1/dataset.json`
- Modify: `data/national-ranking/v1/README.md`
- Modify: `lib/nationalRanking/dataset.test.ts`

**Interfaces:**
- Consumes: source files under `경인지구`, `춘천`, and `위믹스`.
- Produces: all 26 edition/gender units needed by formula version v1.

- [ ] **Step 1: Strengthen the manifest coverage test and verify RED**

```ts
expect(dataset.editions).toHaveLength(26);
expect(dataset.editions.some((edition) => edition.tournamentSlug === "yeongwol"))
  .toBe(false);
expect(
  dataset.editions.filter((edition) => edition.tournamentSlug === "wemix")
).toHaveLength(2);
expect(
  dataset.editions
    .filter((edition) => edition.tournamentSlug === "wemix")
    .every((edition) => edition.year === 2025)
).toBe(true);
```

Run: `npm test -- lib/nationalRanking/dataset.test.ts`  
Expected: FAIL because only 12 editions are present.

- [ ] **Step 2: Add six Gyeongin editions**

Use all 2023-2025 men's and women's image sets. Treat separate named clubs at
one university as independent; map `고려대 KUTC`, `고려대 PETC`, and
`고려대 KMTC` to different canonical slugs. Retain the best team later in the
calculator rather than deleting lower A/B/C results from the manifest.

- [ ] **Step 3: Add six Chuncheon editions**

Read the 2024/2025 XLSX files with a structured workbook parser and visually
verify the rendered brackets. Use the 2023 screenshots for that edition. The
known nominal draws (2024 men 128/women 64; 2025 men 64/women 32) do not replace
actual named entrant counts.

- [ ] **Step 4: Add two WEMIX 2025 editions**

Use the official full-final field counts only after reconciling the official
`30+3` and `18+3` plan with the final entrants. Record the supplied final-stage
screenshots as source references. Use the official completion report to verify
`고려대학교 KUTC` as men's champion and `서울과학기술대학교 느티나무` as
women's champion. Keep other university-only labels unresolved until their club
identity is supported.

- [ ] **Step 5: Add integrity assertions**

For each edition with `sourceStatus: "verified"`, assert exactly one verified
champion and one verified runner-up. Assert every verified result's `sourceRef`
appears in its edition's `sourceRefs` collection or begins with one of those
relative file references.

- [ ] **Step 6: Run the complete engine suite**

Run: `npm test -- lib/nationalRanking`  
Expected: formula, aggregation, validation, and 26-edition coverage tests pass.

- [ ] **Step 7: Commit the complete source manifest**

```bash
git add data/national-ranking/v1/dataset.json data/national-ranking/v1/README.md lib/nationalRanking/dataset.test.ts
git commit -m "data: complete national tournament results"
```

---

### Task 6: Add the auditable Supabase national ranking schema

**Files:**
- Create: `supabase/migrations/20260712120000_create_national_rankings.sql`
- Test: `supabase/migrations/nationalRankingMigrations.test.ts`

**Interfaces:**
- Produces: source tables, formula configuration, immutable snapshots,
  `latest_national_rankings`, public read policies, and service-role write grants.

- [ ] **Step 1: Write failing migration contract tests**

Assert the migration contains:

```ts
expect(sql).toContain("create table if not exists public.national_clubs");
expect(sql).toContain("create table if not exists public.national_tournaments");
expect(sql).toContain("create table if not exists public.national_tournament_editions");
expect(sql).toContain("create table if not exists public.national_team_results");
expect(sql).toContain("create table if not exists public.national_formula_versions");
expect(sql).toContain("create table if not exists public.national_ranking_snapshots");
expect(sql).toContain("create table if not exists public.national_ranking_rows");
expect(sql).toContain("with (security_invoker = true)");
expect(sql).toContain("create view public.latest_national_rankings");
expect(sql).toContain("quality_status in ('verified', 'unresolved', 'missing', 'did_not_enter')");
expect(sql).toContain("formula_version text not null references public.national_formula_versions(version)");
expect(sql).toContain("to anon");
expect(sql).toContain("to service_role");
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts`  
Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Create normalized source tables**

The migration must create these exact natural keys and checks:

```sql
create table public.national_clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  university_name text not null,
  club_name text not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_name, club_name)
);

create table public.national_club_aliases (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.national_clubs(id) on delete cascade,
  normalized_alias text not null unique,
  source_label text not null,
  created_at timestamptz not null default now()
);

create table public.national_tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  scope text not null check (scope in ('national', 'regional')),
  scope_factor numeric not null check (scope_factor in (1.00, 0.85)),
  is_active boolean not null default true
);
```

Add editions keyed by `(tournament_id, edition_year, gender)`, team results
keyed by `(edition_id, source_team_name)`, and a check that `verified` results
have a non-null `club_id`.

- [ ] **Step 4: Create formula and immutable snapshot tables**

`national_formula_versions` stores the JSON config and references.
`national_ranking_snapshots` is unique on `(formula_version, source_revision)`
and has at most one `is_published = true` row. `national_ranking_rows` is unique
on `(snapshot_id, gender, club_id)` and `(snapshot_id, gender, rank)`, stores
numeric totals and JSONB contributions, and checks gender against
`('men', 'women', 'combined')`.

- [ ] **Step 5: Add indexes, RLS, and the latest view**

Index every foreign key and `(snapshot_id, gender, rank)`. Enable RLS on every
table. Grant anon read only to active public clubs/tournaments, active formula,
published snapshots, and rows belonging to a published snapshot. Give raw
editions/results no anon policy. Grant service role full access.

Create `public.latest_national_rankings with (security_invoker = true)` joining
the one published snapshot, rows, and club display fields.

- [ ] **Step 6: Run migration tests and verify GREEN**

Run: `npm test -- supabase/migrations/nationalRankingMigrations.test.ts`  
Expected: all schema, RLS, index, and view assertions pass.

- [ ] **Step 7: Commit the schema**

```bash
git add supabase/migrations/20260712120000_create_national_rankings.sql supabase/migrations/nationalRankingMigrations.test.ts
git commit -m "feat: add national ranking schema"
```

---

### Task 7: Generate an idempotent source-and-snapshot seed

**Files:**
- Create: `lib/nationalRanking/seedPlan.ts`
- Test: `lib/nationalRanking/seedPlan.test.ts`
- Create: `lib/nationalRanking/seedSql.ts`
- Test: `lib/nationalRanking/seedSql.test.ts`
- Create: `scripts/build-national-ranking-seed-sql.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `loadNationalRankingDataset()` and `calculateNationalRankings()`.
- Produces: `buildNationalRankingSeedPlan(dataset, sourceRevision)` and
  `buildNationalRankingSeedSql(plan)`.

- [ ] **Step 1: Write a failing seed-plan test**

Assert a small fixture produces canonical clubs, tournaments, editions, raw
results, formula config, and rows for all three ranking genders. Assert
unresolved results remain in source records but do not appear in contributions.

- [ ] **Step 2: Run seed-plan test and verify RED**

Run: `npm test -- lib/nationalRanking/seedPlan.test.ts`  
Expected: FAIL because `seedPlan.ts` does not exist.

- [ ] **Step 3: Implement the pure seed plan**

```ts
export type NationalRankingSeedPlan = {
  formula: {
    version: typeof NATIONAL_FORMULA_V1.version;
    config: typeof NATIONAL_FORMULA_V1;
    effectiveOn: string;
  };
  sourceRevision: string;
  clubs: NationalRankingDataset["clubs"];
  aliases: NationalRankingDataset["aliases"];
  tournaments: NationalRankingDataset["tournaments"];
  editions: NationalRankingDataset["editions"];
  results: NationalRankingDataset["results"];
  rows: CalculatedRankingRow[];
};

export function buildNationalRankingSeedPlan(
  dataset: NationalRankingDataset,
  sourceRevision: string
): NationalRankingSeedPlan {
  const calculated = calculateNationalRankings(dataset);

  return {
    formula: {
      version: NATIONAL_FORMULA_V1.version,
      config: NATIONAL_FORMULA_V1,
      effectiveOn: "2026-07-12",
    },
    sourceRevision,
    clubs: dataset.clubs,
    aliases: dataset.aliases,
    tournaments: dataset.tournaments,
    editions: dataset.editions,
    results: dataset.results,
    rows: calculated.rows,
  };
}
```

- [ ] **Step 4: Run seed-plan test and verify GREEN**

Run: `npm test -- lib/nationalRanking/seedPlan.test.ts`  
Expected: seed-plan tests pass.

- [ ] **Step 5: Write failing SQL generator tests**

Assert the SQL:

- begins with `begin;` and ends with `commit;`
- upserts natural-key source rows
- replaces each edition's imported team results
- upserts `(formula_version, source_revision)` snapshot
- deletes and reinserts that snapshot's ranking rows
- unpublishes old snapshots before publishing the generated snapshot
- escapes apostrophes in JSON values
- never grants or embeds a credential

- [ ] **Step 6: Implement SQL generation with JSONB recordsets**

Follow `lib/supabaseSeedSql.ts` conventions with local `sqlJson`, `sqlText`, and
`wrapTransaction` helpers. Resolve UUIDs in SQL by natural keys. Keep unresolved
results with a null resolved club ID; make a missing verified club fail through
the database check instead of guessing. Upsert aliases by `normalized_alias`
after clubs and before resolving team results.

- [ ] **Step 7: Add the CLI and package script**

```ts
// scripts/build-national-ranking-seed-sql.ts
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadNationalRankingDataset } from "../lib/nationalRanking/dataset";
import { buildNationalRankingSeedPlan } from "../lib/nationalRanking/seedPlan";
import { buildNationalRankingSeedSql } from "../lib/nationalRanking/seedSql";

const dataset = loadNationalRankingDataset();
const revision = createHash("sha256")
  .update(JSON.stringify(dataset))
  .digest("hex");
const sql = buildNationalRankingSeedSql(
  buildNationalRankingSeedPlan(dataset, revision)
);
const outIndex = process.argv.indexOf("--out");

if (outIndex >= 0) writeFileSync(resolve(process.argv[outIndex + 1]), sql);
else process.stdout.write(sql);
```

Add:

```json
"seed:national:sql": "tsx scripts/build-national-ranking-seed-sql.ts"
```

- [ ] **Step 8: Run all seed tests and generate SQL**

Run: `npm test -- lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.test.ts`  
Expected: all seed tests pass.

Run: `npm run seed:national:sql -- --out /tmp/national-ranking-seed.sql`  
Expected: `/tmp/national-ranking-seed.sql` contains one transaction and no
environment values.

- [ ] **Step 9: Commit seed generation**

```bash
git add lib/nationalRanking/seedPlan.ts lib/nationalRanking/seedPlan.test.ts lib/nationalRanking/seedSql.ts lib/nationalRanking/seedSql.test.ts scripts/build-national-ranking-seed-sql.ts package.json
git commit -m "feat: generate national ranking snapshots"
```

---

### Task 8: Apply and verify the Supabase publication

**Files:**
- No committed file changes unless verification exposes a migration or seed defect.

**Interfaces:**
- Consumes: migration and `/tmp/national-ranking-seed.sql` from Tasks 6-7.
- Produces: one published `national-club-v1` snapshot queryable by anon.

- [ ] **Step 1: Run the full pre-application suite**

Run: `npm test`  
Expected: all tests pass before remote database changes.

- [ ] **Step 2: Apply the migration through the connected Supabase project**

Use the Supabase migration tool with the exact contents of
`20260712120000_create_national_rankings.sql`. Confirm the migration appears in
the remote migration list.

- [ ] **Step 3: Execute the generated seed transaction**

Execute `/tmp/national-ranking-seed.sql` through the connected Supabase SQL
tool. Re-run it once to prove idempotency; the published snapshot and row counts
must remain unchanged.

- [ ] **Step 4: Verify publication and security**

Query and assert:

```sql
select formula_version, gender, count(*)
from public.latest_national_rankings
group by formula_version, gender
order by gender;
```

Expected: `national-club-v1` rows for `men`, `women`, and `combined`.

Using the publishable key, verify the latest view is readable and
`national_team_results` is not readable. Do not expose raw unresolved rows.

- [ ] **Step 5: Record any necessary corrective commit**

Only when remote verification finds a defect, add a forward-only migration or
seed-generator fix with its failing regression test, run the suite, and commit
with `fix: harden national ranking publication`.

---

### Task 9: Add the cached public repository

**Files:**
- Create: `lib/nationalRanking/repository.ts`
- Test: `lib/nationalRanking/repository.test.ts`

**Interfaces:**
- Consumes: `getSupabaseReadClient()` and `latest_national_rankings`.
- Produces: `getNationalRankingPageData(adapter?)` and
  `getCachedNationalRankingPageData()`.

- [ ] **Step 1: Write failing repository tests**

Use an injected adapter returning unsorted view rows. Assert the repository:

- groups rows into `men`, `women`, and `combined`
- sorts by stored rank
- exposes formula version and calculation timestamp once
- returns `null` for no published snapshot
- throws `National ranking read failed: ...` for adapter errors

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/nationalRanking/repository.test.ts`  
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement one-view read mapping**

```ts
export type PublicNationalRankingRow = {
  rank: number;
  clubSlug: string;
  universityName: string;
  clubName: string;
  displayName: string;
  points: number;
  latestEditionPoints: number;
  championships: number;
  runnerUps: number;
};

export type NationalRankingViewRow = {
  formula_version: string;
  calculated_at: string;
  gender: RankingGender;
  rank: number;
  total_points: number;
  latest_edition_points: number;
  championships: number;
  runner_ups: number;
  club_slug: string;
  university_name: string;
  club_name: string;
  display_name: string;
};

export type NationalRankingReadAdapter = {
  listLatestRows(): Promise<NationalRankingViewRow[]>;
};

export type NationalRankingPageData = {
  formulaVersion: string;
  calculatedAt: string;
  rankings: Record<RankingGender, PublicNationalRankingRow[]>;
};

export async function getNationalRankingPageData(
  adapter: NationalRankingReadAdapter = createNationalRankingReadAdapter()
): Promise<NationalRankingPageData | null> {
  const rows = await adapter.listLatestRows();
  if (rows.length === 0) return null;
  // Validate shared metadata, group by gender, sort by rank, and map DB fields.
}
```

The default adapter performs one `.from("latest_national_rankings").select(...)`
query ordered by gender and rank.

- [ ] **Step 4: Add a five-minute server cache**

Wrap the no-argument repository call with `unstable_cache` using key
`["national-ranking-v1"]`, tag `national-ranking`, and `revalidate: 300`.
Keep the injected function uncached for deterministic unit tests.

- [ ] **Step 5: Run repository tests and verify GREEN**

Run: `npm test -- lib/nationalRanking/repository.test.ts`  
Expected: all repository mapping and error tests pass.

- [ ] **Step 6: Commit the read path**

```bash
git add lib/nationalRanking/repository.ts lib/nationalRanking/repository.test.ts
git commit -m "feat: read published national rankings"
```

---

### Task 10: Replace the root placeholder with the ranking experience

**Files:**
- Create: `app/NationalRankingTable.tsx`
- Test: `app/NationalRankingTable.test.tsx`
- Create: `app/RankingMethodologyInfo.tsx`
- Test: `app/RankingMethodologyInfo.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `getCachedNationalRankingPageData()` and public row types from Task 9.
- Produces: a real root ranking page and compact methodology summary.

- [ ] **Step 1: Install the established icon dependency**

Run: `npm install lucide-react`  
Expected: `lucide-react` appears in dependencies and the lockfile updates.

- [ ] **Step 2: Write failing ranking-table tests**

Assert:

```ts
expect(
  screen.getByRole("tab", { name: "남자부" }).getAttribute("aria-selected")
).toBe("true");
expect(screen.getByRole("tab", { name: "여자부" })).toBeDefined();
expect(screen.getByRole("tab", { name: "종합" })).toBeDefined();
expect(screen.getByRole("columnheader", { name: "순위" })).toBeDefined();
expect(screen.getByRole("columnheader", { name: "동아리" })).toBeDefined();
expect(screen.getByRole("columnheader", { name: "점수" })).toBeDefined();
```

Click `여자부` and assert only women's rows remain. Click `종합` and assert the
secondary label is visible.

- [ ] **Step 3: Run table tests and verify RED**

Run: `npm test -- app/NationalRankingTable.test.tsx`  
Expected: FAIL because the component does not exist.

- [ ] **Step 4: Implement the semantic ranking table**

Use a three-button `role="tablist"`, a real `<table>`, stable columns, and
`Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 })`. Default to men.
Rows show rank, university, club name, and score; combined remains the last,
visually secondary tab.

- [ ] **Step 5: Write failing methodology-summary tests**

Assert the `Info` icon button has the label `랭킹 산정 방식 보기`, opens a
`role="dialog"`, shows exactly the two approved summary sentences, and links
`계산식 자세히 보기` to `/methodology`. Assert Escape and the `X` icon close it.

- [ ] **Step 6: Implement the compact info surface**

Use `Info` and `X` from `lucide-react`. Use one controlled overlay component:
desktop CSS positions it as a popover; mobile CSS fixes it as a bottom sheet.
The icon-only buttons receive `aria-label` and `title`. Do not put the complete
formula in this component.

- [ ] **Step 7: Write the failing root-page test**

Mock `getCachedNationalRankingPageData()` and assert the page shows:

- heading `전국 대학 테니스 동아리 랭킹`
- formula version `national-club-v1`
- ranking table rather than `구축할 예정입니다`
- compact link to `/seoultech`
- no `영월` tournament card

Also test the null snapshot state text `검증된 전국 랭킹을 준비하고 있습니다.`
and the read-error state text `전국 랭킹을 불러오지 못했습니다.`.

- [ ] **Step 8: Replace `app/page.tsx`**

Make it an async server component. Catch repository errors for a nonblank
retryable state. Render a quiet header, gender ranking, source update metadata,
and a compact link to the existing campus ranking. Do not retain the marketing
hero or tournament-card grid.

- [ ] **Step 9: Add responsive styles and CSS contract tests**

Use one full-width ranking surface with 8px-or-less radii, no nested cards, and
fixed table columns. At `max-width: 640px`, keep rank and score aligned while
allowing the club label to wrap. Add bottom-sheet safe-area padding and ensure
no button text can overflow.

- [ ] **Step 10: Run UI tests and verify GREEN**

Run: `npm test -- app/NationalRankingTable.test.tsx app/RankingMethodologyInfo.test.tsx app/page.test.tsx app/globals.test.ts`  
Expected: all root ranking, interaction, empty, error, and responsive tests pass.

- [ ] **Step 11: Commit the ranking experience**

```bash
git add app/NationalRankingTable.tsx app/NationalRankingTable.test.tsx app/RankingMethodologyInfo.tsx app/RankingMethodologyInfo.test.tsx app/page.tsx app/page.test.tsx app/globals.css app/globals.test.ts package.json package-lock.json
git commit -m "feat: publish national club rankings"
```

---

### Task 11: Add the full methodology page

**Files:**
- Create: `app/methodology/page.tsx`
- Test: `app/methodology/page.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: constants from `NATIONAL_FORMULA_V1` where useful.
- Produces: public `/methodology` explanation matching formula version v1.

- [ ] **Step 1: Write a failing methodology-page test**

Assert headings and key values:

```ts
expect(screen.getByRole("heading", { name: "랭킹 계산 방식", level: 1 })).toBeDefined();
expect(screen.getByRole("heading", { name: "공식", level: 2 })).toBeDefined();
expect(screen.getByText("national-club-v1")).toBeDefined();
expect(screen.getByText("우승")).toBeDefined();
expect(screen.getAllByText("100").length).toBeGreaterThan(0);
expect(screen.getByText("경인지구 연맹전")).toBeDefined();
expect(screen.getByText("0.85")).toBeDefined();
expect(screen.getByRole("link", { name: "ATP 랭킹 점수표" })).toBeDefined();
expect(
  screen
    .getByRole("link", { name: "전국 랭킹으로 돌아가기" })
    .getAttribute("href")
).toBe("/");
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- app/methodology/page.test.tsx`  
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the document page**

Render the approved sections in this order:

1. 지표 정의
2. 공식
3. 진출 단계 점수
4. 대회 범위 가중치
5. 참가 규모 가중치
6. 연도 가중치
7. A/B/C팀 처리
8. 남자부·여자부·종합
9. 계산 예시
10. 데이터 검증 원칙
11. 버전과 시행일
12. 공식 참고 자료

Show the formula as:

```text
대회 점수 = 진출 단계 점수 × 대회 범위 × 참가 규모 × 연도 가중치
```

Include the worked examples `110`, `66`, and `66.3` from the design. Use
semantic tables and outbound links to ATP, BWF, OWGR, UEFA, WEMIX, and the
solved.ac UX reference.

- [ ] **Step 4: Style it as readable documentation**

Use a constrained document column, normal section bands rather than cards,
horizontal table scrolling on mobile, and an overflow-safe formula block.
Respect `prefers-reduced-motion`; this page needs no decorative animation.

- [ ] **Step 5: Run the methodology and root interaction tests**

Run: `npm test -- app/methodology/page.test.tsx app/RankingMethodologyInfo.test.tsx`  
Expected: the detail page and summary link tests pass.

- [ ] **Step 6: Commit the methodology**

```bash
git add app/methodology/page.tsx app/methodology/page.test.tsx app/globals.css
git commit -m "docs: explain national ranking methodology"
```

---

### Task 12: Verify, visually polish, push, and deploy

**Files:**
- Modify only files implicated by failing verification, always with a failing regression test first.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: green main branch and verified Vercel production pages.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`  
Expected: all tests pass.

Run: `npm run lint`  
Expected: ESLint exits 0.

Run: `npm run build`  
Expected: Next.js production build exits 0 and includes `/` and `/methodology`.

- [ ] **Step 2: Start the local server**

Run: `npm run dev -- --port 3020`  
Expected: server reports `http://localhost:3020` and remains running for QA.

- [ ] **Step 3: Perform browser QA at fixed viewports**

Use the in-app browser at:

- desktop `1440 x 1000`
- mobile `390 x 844`

Verify `/`, the three gender tabs, the info popover/bottom sheet,
`/methodology`, `/seoultech`, `/petc`, and `/admin`. Capture screenshots of the
root page and methodology at both viewports. Check that columns stay aligned,
tables do not overflow, the info icon is easy to activate, and the mobile sheet
clears browser safe areas.

- [ ] **Step 4: Fix each discovered defect test-first**

For every visual or behavioral defect, add the smallest failing component or
CSS contract test, implement the narrow fix, rerun the affected test, and repeat
the screenshot. Stop when no text overlaps, clips, or shifts columns.

- [ ] **Step 5: Re-run production verification**

Run: `npm test && npm run lint && npm run build`  
Expected: every command exits 0 after QA fixes.

- [ ] **Step 6: Push the completed commits**

Run: `git status --short`  
Expected: clean working tree.

Run: `git push origin main`  
Expected: GitHub accepts all commits and Vercel begins the production deployment.

- [ ] **Step 7: Verify Vercel production**

Open:

- `https://koreatennisranking.com/`
- `https://koreatennisranking.com/methodology`
- `https://koreatennisranking.com/seoultech`
- `https://koreatennisranking.com/petc`
- `https://koreatennisranking.com/admin`

Expected: all return 200; the root renders the published Supabase snapshot; the
methodology summary links to the detail page; existing campus/admin pages remain
functional.
