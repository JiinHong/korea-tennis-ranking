# Expandable National Ranking Results and Podium Crowns Design

**Date:** 2026-07-14
**Status:** Approved for implementation
**Formula version:** `national-club-v3`

## Goal

Let visitors inspect a club's strongest historical tournament results without
leaving the national ranking, add bronze crowns for 2025 semifinal finishes,
and preserve the selected men's, women's, or combined division when visitors
open and leave a club's complete results page.

## Scope

This change covers four connected behaviors:

1. Extend podium honors from champion and runner-up to semifinal.
2. Expand one national ranking row at a time to show that club's three best
   recorded results.
3. Add men's, women's, and combined tabs to the complete club results page.
4. Preserve the selected division in the URL and through browser navigation.

Ranking points, ranking order, tournament weights, and the set of source
results do not change.

## Podium Crown Rules

The three crown assets represent these stages:

| Stage | Label | Asset |
| --- | --- | --- |
| Champion | 우승 | `gold-crown.png` |
| Runner-up | 준우승 | `silver-crown.png` |
| Semifinal | 4강 | `bronze-crown.png` |

Two semifinalists may receive bronze crowns. A bronze crown means a verified
semifinal finish; it does not imply a separate third-place match.

The ranking table continues to display crowns for the 2025 editions only. This
same 2025-only display rule applies to crowns beside results in the expanded
row and on the complete club results page. Older podium finishes remain part
of the historical result data and may be selected as a best result, but they
are shown without a crown.

The existing desktop-hover and mobile-tap tooltip behavior remains on crowns
in the compact ranking row. Its label becomes one of `우승`, `준우승`, or
`4강`. Crowns used as leading markers in result lists are small, static icons
because the adjacent row already states the year, competition, division, and
stage.

## Best Historical Results

Each published ranking row stores up to three derived `bestResults`. The
selection considers every verified 16강-or-better result in the recorded
dataset, including results that no longer contribute points to the current
three-edition scoring window.

Multiple source teams from the same club in the same competition, year, and
division are reduced to the best result before the top three are selected.
This matches the ranking rule that only the club's strongest team represents
that edition.

Results are ordered by these deterministic keys:

1. Stage: champion, runner-up, semifinal, quarterfinal, round of 16.
2. Tournament prestige: Yanggu, then Gyeongin and Chuncheon, then Inje and
   WEMIX.
3. Newer edition year.
4. Larger verified entrant count.
5. Tournament display order and source team name for a stable final tie-break.

Men's ranking rows select from men's results, women's rows from women's
results, and combined rows select the best three across both divisions.

Each public best-result record contains only display-safe derived data:

```ts
type NationalRankingBestResult = {
  editionKey: string;
  tournamentSlug: string;
  tournamentName: string;
  year: number;
  gender: "men" | "women";
  actualEntrants: number;
  stage:
    | "champion"
    | "runner_up"
    | "semifinal"
    | "quarterfinal"
    | "round_of_16";
  sourceTeamName: string;
};
```

## Ranking Row Interaction

The club cell becomes an accessible disclosure button. Selecting it expands a
detail row immediately beneath the ranking row. The detail row contains:

- a compact list of up to three best historical results;
- a small 2025 crown at the left when the result is a podium finish;
- year, tournament, division, and final stage;
- an `전체 성적 보기` link to the complete club page.

Only one club can be expanded at a time. Selecting another club closes the
previous row and opens the new one. Selecting the open club closes it. Changing
the ranking division closes any open row.

The disclosure exposes `aria-expanded` and `aria-controls`. The expansion uses
a CSS grid-track and opacity transition so the table grows smoothly without a
fixed height. Under `prefers-reduced-motion: reduce`, the transition is
disabled. Crowns remain separately interactive and never trigger the row
disclosure.

If no verified 16강-or-better result exists, the expanded row shows a quiet
empty state and still offers the complete results link.

## Division URL State

The canonical query parameter is:

```text
?gender=men
?gender=women
?gender=combined
```

The national ranking defaults to `men` when the parameter is absent or
invalid. Selecting a ranking tab updates the current history entry without
scrolling, so opening a club page creates a new entry whose previous page
already contains the correct division.

The expansion's complete-results link includes the active division, for
example:

```text
/clubs/seoultech-neutinamu?gender=women
```

The club page defaults to the incoming valid division. A direct club URL with
no division defaults to `combined`, which is the broadest standalone view.
Changing a club-page tab updates its query parameter without adding noisy
history entries.

The visible `전국 랭킹으로 돌아가기` link points to the national ranking with
the currently selected division. Browser Back returns to the division from
which the visitor entered because the ranking tab state was already reflected
in the previous URL.

## Complete Club Results Page

The page keeps one fetched result collection and filters it in a client view:

- `남자부` shows men's records only.
- `여자부` shows women's records only.
- `종합` shows both divisions.

Each tab uses the same accessible keyboard behavior as the national ranking
tabs. The record count and empty state reflect the active division. Result
rows keep the existing chronological order. A 2025 champion, runner-up, or
semifinal row receives the matching small crown to the left of its content.

## Supabase Snapshot Contract

`national_ranking_rows` receives a `best_results jsonb` array with a JSON array
constraint. The published `latest_national_rankings` security-invoker view
exposes it alongside `honors` and `contributions`.

The ranking calculation derives `bestResults` from the same validated dataset
used to generate the immutable snapshot. The seed process writes the field and
extends `honors` to permit `semifinal`. The public repository parses both
fields defensively. No additional request is made when a visitor opens a row,
and no service-role credential reaches the browser.

The migration preserves existing RLS and grants. After the schema change, a
new national ranking snapshot is published so production rows contain bronze
honors and historical best results.

## Error Handling

- Invalid `gender` query values fall back to the route's documented default.
- Invalid `honors` or `best_results` JSON fails the ranking repository read
  rather than silently displaying inconsistent data.
- A club with no result in the active division shows the division-specific
  empty state.
- Missing crown assets fail tests and build verification before deployment.

## Test Strategy

1. Calculation tests cover semifinal honors, all-time selection, per-division
   and combined top-three lists, edition deduplication, and deterministic ties.
2. Seed and migration tests cover `best_results`, the security-invoker view,
   JSON constraints, and semifinal honor persistence.
3. Repository tests cover valid parsing and malformed JSON rejection.
4. Ranking component tests cover bronze crowns, one-open-row accordion
   behavior, empty results, active-division detail links, and URL updates.
5. Club page tests cover incoming division selection, filtering, counts,
   2025-only crowns, and division-preserving back links.
6. CSS contract tests cover the expansion transition and reduced-motion mode.
7. Browser verification covers desktop and mobile ranking expansion, crown
   alignment, division navigation, the complete results page, and browser Back.

## Completion Criteria

- Every verified 2025 semifinal honor appears as a bronze crown in its matching
  ranking division.
- Exactly one ranking row can be open at a time and it opens without a network
  request.
- The displayed historical results follow the documented ordering and contain
  at most three entries.
- Men's, women's, and combined state survives detail navigation and Back.
- The complete results page filters correctly and marks 2025 podium rows.
- Unit tests, lint, production build, Supabase validation queries, and desktop
  and mobile browser checks pass before the changes are pushed.
