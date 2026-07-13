# National Ranking Canonicalization, Integer Scoring, and Honors Design

**Date:** 2026-07-13
**Status:** Approved for implementation
**Formula version:** `national-club-v3`

## Goal

Correct club identities across the national university tennis ranking dataset,
score WEMIX OPEN as a small competition, replace fractional scoring with an
exact small-integer formula, and display permanent championship and runner-up
crowns beside each ranked club.

## Scope

This change covers four connected behaviors:

1. Merge tournament team names and aliases that the administrator confirmed
   belong to the same club.
2. Resolve WEMIX OPEN 2025 entries and selected school-only final results to a
   concrete club without circular ranking calculations.
3. Publish a new exact-integer ranking snapshot using formula v3.
4. Publish and render all-time championship and runner-up honors independently
   from the three-year score window.

It does not merge remaining clubs that have not been confirmed as aliases. In
particular, Korea University KUTC, PETC, and KMTC remain separate clubs.

## Canonical Club Identity

The canonical club record owns all aliases, source results, points, and honors.
Merged club records are removed from the published dataset after every alias
and result reference has been moved to the canonical slug.

| University | Canonical club | Names merged into it |
| --- | --- | --- |
| 경기대학교 | Ktf | KTF, Kft, 테토남 |
| 단국대학교 천안캠퍼스 | DKUTC | 호두 |
| 단국대학교 죽전캠퍼스 | DKUTC | 단웅, 웅비 |
| 성균관대학교 | STC | 공자, 맹자, 순자, SIT |
| 연세대학교 | YUTT | 더트루트루쓰, 진리, 정의, 자유 |
| 연세대학교 | 쿠크다스 | 쿠크리스 |
| 인하대학교 | 라품 | 비룡, 라쿤 |
| 중앙대학교 | Love4T | 푸앙이, 푸렁이 |
| 한국항공대학교 | ACE | 송골매 |
| 한양대학교 | HYTC | 블루, 사자 |
| 홍익대학교 | HITC | 홍일보이 |
| 충남대학교 | 굿샷 | 콧샷 |
| 가톨릭대학교 | 코트랑 | Badboys |
| 서강대학교 | SGTC | Brg, FA |
| 숭실대학교 | SSTC | 디크호스 |
| 전북대학교 | ACE | 에이스 |

Campus is part of university identity. `단국대학교 천안캠퍼스 DKUTC` and
`단국대학교 죽전캠퍼스 DKUTC` are independent clubs, matching the existing
Kyung Hee campus representation. Hanyang University ERICA 하이텍 also remains
separate from Hanyang University HYTC.

Historical DKUTC rows without a campus are frozen to the highest established
campus club in that gender before those rows are assigned:

- Men's campus-unspecified DKUTC rows belong to 죽전캠퍼스 DKUTC.
- Women's campus-unspecified DKUTC rows belong to 천안캠퍼스 DKUTC.

All five affected rows are first-match losses, so this cleanup creates no
points or honors.

## School-Only Result Resolution

Identity resolution follows this order:

1. An explicit club name or administrator-confirmed alias maps directly to its
   canonical club.
2. A campus-qualified school label maps only within that campus.
3. A school-only label maps to the highest-ranked club from that university in
   the same gender, calculated before the inferred result batch is added.
4. A label that does not identify even a school remains unresolved.

The selected `clubSlug` is written into source data and never recalculated at
request time. Its note records that it was inferred from the pre-assignment
gender ranking. This prevents the historical owner from changing after a new
snapshot changes the ranking order.

The inference rule is applied to:

- every WEMIX OPEN 2025 row;
- championship and runner-up rows from other competitions whose stage and
  school are visible;
- administrator-confirmed aliases listed in this document.

It is not applied broadly to unresolved non-final rows from other competitions.
Those rows need either an explicit alias confirmation or a separate source
review before scoring. This avoids assigning similarly named clubs by guess.

## WEMIX OPEN 2025

WEMIX OPEN is a real but small competition. Its supplied final draws establish
the actual field used for this ranking:

- Men's edition: 8 teams.
- Women's edition: 12 teams.

Both editions become verified and all visible terminal results become eligible
for formula v3. Clear clipped labels are resolved directly, including
`과기대 느티나무 (1차우...` to 서울과학기술대학교 느티나무 and
`가천대학교 타이브...` to 가천대학교 타이브레이크.

School-only men's entries are frozen to these pre-WEMIX men's clubs:

| Source school | Assigned club |
| --- | --- |
| 고려대학교 | KUTC |
| 영남대학교 | YUTA |
| 서울시립대학교 | 어프로치 |
| 가천대학교 | 타이브레이크 |
| 서울대학교 | TNT |
| 전북대학교 | ACE |
| 연세대학교 | YUTT |
| 경기대학교 | Ktf |

School-only women's entries are resolved in the same gender. Existing explicit
club labels, such as 고려대 KUTC and 연세대학교 YUTT, remain direct mappings.

## Exact Integer Formula V3

Formula v3 uses multiplication of integers only:

```text
competition contribution
  = stage units
  x tournament units
  x field-size units
  x recency units
```

There is no division, logarithm, decimal intermediate, rounding, or display-only
conversion. Stored and displayed scores are the exact calculated integers.

### Stage units

| Result | Units |
| --- | ---: |
| Champion | 21 |
| Runner-up | 13 |
| Semifinal | 8 |
| Quarterfinal | 5 |
| Round of 16 | 3 |
| Round of 32 | 2 |
| Round of 64 | 1 |
| Lost first played match | 0 |

The sequence preserves a steep deep-run curve while keeping each value small.

### Tournament units

| Competition | Units |
| --- | ---: |
| 국토정중앙배(양구) | 3 |
| 경인지구 연맹전 | 2 |
| 춘천소양강배 | 2 |
| 하늘내린인제 | 1 |
| WEMIX OPEN | 1 |

This represents Yanggu as the most authoritative national club event,
Gyeongin and Chuncheon as the second tier, and the shorter-history Inje and
WEMIX events as the third tier.

### Field-size units

| Actual entered teams | Units |
| --- | ---: |
| 1-12 | 1 |
| 13-31 | 2 |
| 32-63 | 3 |
| 64 or more | 4 |

WEMIX therefore receives the smallest field unit in both divisions.

### Recency units

Recency remains independent per competition:

| Age from that competition's latest verified edition | Units |
| --- | ---: |
| Latest | 3 |
| One year older | 2 |
| Two years older | 1 |
| Older | 0 |

### Examples

```text
2025 Yanggu champion: 21 x 3 x 4 x 3 = 756
2025 Gyeongin champion with 22 teams: 21 x 2 x 2 x 3 = 252
2025 Inje champion with 20 teams: 21 x 1 x 2 x 3 = 126
2025 WEMIX champion with 8 or 12 teams: 21 x 1 x 1 x 3 = 63
```

The scoring unit remains `(club, gender, competition, edition year)`. If one
club sends multiple teams, only its best result in that scoring unit counts.

## All-Time Honors

An honor is created from each concrete champion or runner-up result:

```ts
type NationalRankingHonor = {
  editionKey: string;
  tournamentSlug: string;
  tournamentName: string;
  year: number;
  gender: "men" | "women";
  stage: "champion" | "runner_up";
};
```

Honors are independent of score eligibility. When a result becomes older than
the three-edition score window, its points expire but its honor remains in the
club's all-time list. A result from an edition with unresolved field-size data
may also show an honor when the final stage and club identity are known, even
though that edition cannot score yet.

Men's ranking rows contain men's honors, women's rows contain women's honors,
and combined rows contain both, sorted newest year first and then by tournament
display order. Tie-breaker championship and runner-up counts remain based on
active scoring contributions rather than all-time honors.

## Supabase Snapshot Contract

`national_ranking_rows` receives an `honors jsonb` array with an array type
check, parallel to `contributions`. The latest public ranking view exposes the
field while retaining `security_invoker = true` and the existing published
snapshot policy.

Seed generation writes formula v3 configuration, canonical clubs, rewritten
aliases/results, integer points, and all-time honors as one immutable snapshot.
The public repository selects and validates the new field. No service-role key
is exposed to the browser.

## Ranking UI

Each honor renders immediately after the club name:

- gold crown image for a championship;
- silver crown image for a runner-up finish;
- one crown per honor, so repeated achievements produce repeated crowns.

The supplied transparent PNG files are copied into `public/` with stable,
English filenames and displayed without a surrounding badge or card.

The accessible label and compact tooltip use this format:

```text
2025 위믹스 여자부 우승
2024 양구 남자부 준우승
```

Desktop pointer devices reveal the tooltip on hover or keyboard focus. Touch
devices toggle it on tap. Outside tap and Escape close an open tooltip. The
interaction follows the existing methodology information tooltip pattern.

Scores use Korean thousands separators with zero fractional digits. Ranking
table row geometry remains stable when multiple crown icons are present, and
icons wrap with the club name on narrow mobile screens rather than overlapping
the score column.

## Validation

TDD covers these behaviors in order:

1. Exact canonical club and alias/result rewrites, including campus-separated
   Dankook DKUTC.
2. Deterministic WEMIX and school-only final assignments.
3. Formula v3's exact integer outputs, field tiers, recency tiers, and no
   fractional points in any calculated row.
4. Best-team-per-club scoring after aliases are merged.
5. All-time honors surviving score expiration and combining by gender.
6. Seed SQL and migration security for the new JSON field.
7. Repository parsing and crown rendering, including hover, focus, tap,
   outside-tap, and Escape behavior.
8. Full unit suite, lint, production build, desktop/mobile browser screenshots,
   and the deployed public page.

