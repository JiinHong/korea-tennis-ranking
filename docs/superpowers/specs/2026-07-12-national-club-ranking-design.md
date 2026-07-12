# National University Tennis Club Ranking Design

**Date:** 2026-07-12  
**Status:** Approved formula; implementation pending  
**Formula version:** `national-club-v1`

## Goal

Build separate men's and women's rankings for Korean university tennis clubs
from verified team-tournament results. Publish a secondary combined ranking and
an auditable methodology page that explains every factor in the score.

The ranking entity is a club, not a university. Clubs at the same university,
such as Korea University KUTC, PETC, and KMTC, remain independent entities.

## Included competitions

The first ranking version uses these five competitions:

1. 국토정중앙배(양구)
2. 경인지구 연맹전
3. 하늘내린인제
4. 춘천소양강배
5. WEMIX OPEN

영월 전국대학 동아리 테니스 대회 is excluded. WEMIX OPEN has only a
2025 edition in the source set; nonexistent 2023 and 2024 editions are not
recorded as zero-point results.

## Ranking outputs

- Men's ranking: primary output, calculated only from men's results.
- Women's ranking: primary output, calculated only from women's results.
- Combined ranking: secondary output, calculated as men's points plus women's
  points.
- Scores are calculated at full precision and rounded only for display.

## Scoring unit

One scoring unit is:

```text
(club, gender, competition, edition year)
```

If a club enters multiple teams such as A, B, and C in the same scoring unit,
only that club's best finishing team scores. Other teams neither add points nor
reduce the best team's score.

## Formula

```text
competition contribution
  = stage points
  x competition scope factor
  x field-size factor
  x edition recency factor

club gender score
  = sum of the club's competition contributions
```

For multiple teams from one club:

```text
scoring-unit contribution
  = max(contribution of team A, team B, team C, ...)
```

### Stage points

The stage curve follows the normalized 2026 ATP main-draw relationship. It
intentionally rewards titles and deep runs more than participation.

| Final result | Stage points |
| --- | ---: |
| Champion | 100 |
| Runner-up | 65 |
| Semifinal | 40 |
| Quarterfinal | 20 |
| Round of 16 | 10 |
| Round of 32 | 5 |
| Round of 64 | 2.5 |
| Lost first match actually played | 0 |

A bye is not a win. A team that receives a bye and loses its first played match
receives zero points. A team that qualified into a documented final-stage draw
may receive the points for the verified stage it reached even if earlier
qualifying match details are not present in the supplied screenshot.

### Competition scope factor

| Competition | Scope | Factor |
| --- | --- | ---: |
| 국토정중앙배(양구) | National | 1.00 |
| 하늘내린인제 | National | 1.00 |
| 춘천소양강배 | National | 1.00 |
| WEMIX OPEN | National | 1.00 |
| 경인지구 연맹전 | Regional | 0.85 |

Prize money, sponsor size, and competition age do not create additional
bonuses. This avoids subjective prestige scoring. The regional adjustment is
deliberately modest because field size is measured separately.

### Field-size factor

`N` is the number of actual entered teams in that gender and edition, excluding
BYEs and teams withdrawn before playing.

```text
field-size factor
  = clamp(0.85, 1.20, 1 + 0.10 x log2(N / 32))
```

Reference values:

| Actual teams | Factor |
| --- | ---: |
| 16 | 0.90 |
| 32 | 1.00 |
| 64 | 1.10 |
| 128 | 1.20 |

The logarithmic curve recognizes that winning a larger draw is harder without
making a 128-team competition worth four times a 32-team competition.

WEMIX field size uses the full official final field, not only the last bracket
visible in a screenshot. The 2025 official plan lists `30+3` men's teams and
`18+3` women's teams, subject to verification against the final entrants.

### Edition recency factor

Recency is evaluated independently for each competition. The newest available
edition of that competition receives full weight.

| Edition age within competition | Factor |
| --- | ---: |
| Latest edition | 1.00 |
| One year older | 0.60 |
| Two years older | 0.36 |
| Older | 0 |

Equivalent definition:

```text
recency factor = 0.60 ^ (latest edition year - result year)
```

Only the latest three years are eligible. When a competition's 2026 result is
added, its 2025 and 2024 editions become `0.60` and `0.36`, and its 2023 edition
expires. A competition that did not exist in a year has no result row and is not
treated as a missed appearance.

## Worked example

A club wins the latest national edition with 64 actual teams:

```text
100 x 1.00 x 1.10 x 1.00 = 110 points
```

The same result from the prior edition contributes:

```text
100 x 1.00 x 1.10 x 0.60 = 66 points
```

A latest regional runner-up in a 128-team draw contributes:

```text
65 x 0.85 x 1.20 x 1.00 = 66.3 points
```

## Tie-breaking

Ties are resolved in this order:

1. More points from the latest editions
2. Highest single competition contribution
3. More championships
4. More runner-up finishes
5. Korean alphabetical order for stable display

The ranking calculation retains full precision during tie-breaking.

## Data quality rules

Each imported result has one of these states:

- `verified`: club identity, gender, edition, field size, and stage are known;
  the result may score.
- `unresolved`: the source is real but club identity or stage is ambiguous; the
  result does not score until resolved.
- `missing`: a source is expected but unavailable; it is never silently changed
  to non-participation.
- `did_not_enter`: non-participation is confirmed; contribution is zero.

University-only labels are not guessed. For example, a WEMIX men's entry named
only `고려대학교` must be mapped to KUTC, PETC, or KMTC using an official entry
list or administrator confirmation before it scores.

Club names require canonical IDs and an alias table. Team suffixes such as A,
B, and C are stored separately from club identity rather than removed with
free-form string manipulation.

## Formula versioning

All calculated snapshots store `formula_version = national-club-v1` and the
exact factor configuration used. A future change creates a new version instead
of overwriting the meaning of historical scores.

At minimum, a ranking snapshot records:

- formula version
- calculation timestamp
- source result revision
- men's, women's, and combined scores
- each scored contribution and its four factors

This allows every displayed total to be reconstructed.

## Public methodology UX

### Ranking-page summary

The national ranking page places a small circular `Info` icon next to the
points/ranking methodology label. It uses the project's icon library and has an
accessible label such as `랭킹 산정 방식 보기`.

Activation opens a compact popover on desktop and a compact bottom sheet on
mobile. It contains only:

- `대회 성적에 진출 단계, 참가 규모, 대회 범위, 최근 연도 가중치를 적용합니다.`
- `같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.`
- a text link: `계산식 자세히 보기`

The summary never displays the full formula or a dense table over the ranking.
Clicking outside, pressing Escape, or activating the close button dismisses it.

### Methodology page

`/methodology` is a public, shareable page inspired by the information
structure of solved.ac Help. It contains:

1. What the ranking measures
2. The complete formula
3. Stage-points table
4. Competition-scope table
5. Field-size formula and reference values
6. Edition-recency table
7. Multiple-team and club-identity rules
8. Men's, women's, and combined ranking rules
9. One worked calculation example
10. Data-quality policy
11. Current formula version and effective date
12. Primary reference links

The page uses normal document typography rather than a dashboard full of
cards. Tables scroll horizontally on narrow screens, and the formula is shown
in a stable-width block that does not overflow.

## References

- ATP 2026 rankings FAQ and points table:
  https://www.atptour.com/en/rankings/rankings-faq
- BWF World Ranking System:
  https://system.bwfbadminton.com/documents/folder_1_81/folder_1_82/New-Regulations-2018/5.3.3.1%20World%20Ranking%20System.pdf
- Official World Golf Ranking methodology:
  https://www.owgr.com/how-the-ranking-works
- UEFA club ranking overview:
  https://www.uefa.com/nationalassociations/uefarankings/
- WEMIX OPEN 2025 official final plan:
  https://wepublic.blob.core.windows.net/wemix-open/overview/contest_overview.pdf
- solved.ac rating explanation UX reference:
  https://help.solved.ac/ko/stats/ac-rating

## Error handling

- The public ranking remains available if the methodology content fails; the
  info surface shows a retryable error instead of blocking rankings.
- An unresolved source result is visible in administrator data-quality tools
  but excluded from public score totals.
- A calculation fails closed when a required verified field is missing. It does
  not substitute an inferred club, stage, entrant count, or factor.
- Import and calculation errors identify the competition, edition, gender,
  source file, and affected row/result.

## Testing strategy

Implementation follows TDD and covers:

- every stage-point value
- first-played-match loss and BYE behavior
- field-size factor boundaries and reference values
- independent per-competition recency decay
- WEMIX's single historical edition
- best-team-only aggregation for A/B/C teams
- independent men's and women's totals
- combined total
- tie-breaking at full precision
- unresolved and missing data exclusion
- formula-version persistence
- accessible info control behavior
- summary-to-methodology navigation
- methodology tables and formula on mobile and desktop

## Out of scope for this version

- Opponent-strength or Elo adjustments
- Match-level score-margin bonuses
- Multiple-team participation bonuses
- Prize-money or sponsor bonuses
- 영월 results
- Manual prestige overrides per competition
- Automatic OCR publication without verification
