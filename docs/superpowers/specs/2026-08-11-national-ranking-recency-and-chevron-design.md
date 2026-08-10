# National Ranking Recency And Chevron Design

**Date:** 2026-08-11  
**Status:** Approved direction; implementation pending

## Goal

Reduce the latest-edition advantage without shrinking the published score scale,
and make the national-ranking row chevron look more acute and refined.

## Settled Decisions

- Publish a new `national-club-v7` formula.
- Use recency weights `3.5`, `2.5`, and `1` for the latest, one-year-old,
  and two-year-old editions. Older editions remain excluded.
- Preserve the v6 stage curve and tournament prestige weights.
- Show fractional totals only when needed, with at most one decimal place.
  Integer totals remain visually unchanged.
- Replace the font-dependent `〉` character with a small inline SVG chevron.
  Its two strokes meet at a visibly narrower angle while retaining the existing
  position, color, expansion rotation, and hidden accessibility treatment.

## Ranking Effect

The selected weights keep the sum of the three recency weights at `7`, matching
the current `4 + 2 + 1` scale. On the current verified dataset:

- combined points change from `33,200` to `33,092.5` (`-0.32%`);
- the combined top ten remain in the same order;
- SeoulTech Neutinamu's women's score changes from `2,644` to `2,517` and
  remains first;
- SeoulTech Neutinamu's combined score changes from `3,492` to `3,295` and
  remains first;
- Seoul National University's women's ranking changes from eighth to fifth;
- Chungnam Good Shot's men's ranking changes from eighth to sixth;
- SeoulTech Neutinamu's men's ranking changes from sixth to eighth.

This is intentionally a stronger rebalancing than `3.75 / 2.25 / 1`: it lowers
latest-edition points by `12.5%`, raises one-year-old points by `25%`, and keeps
two-year-old points unchanged.

## Formula Architecture

Historical formula constants v1 through v6 remain immutable. Add a v7 formula
that reuses the v6 stage and tournament units and owns the new recency tuple.
Make v7 the default for calculation, seed generation, methodology display, and
published snapshot metadata.

The current `IntegerNationalFormula` naming no longer describes v7. Rename the
internal unit-formula type guard and related type aliases to `UnitNationalFormula`
terminology while preserving the public calculation behavior of v1 through v6.
No field-size weighting returns.

## Score Display

The new half-step weights can produce `.5` point values. Format national-ranking
totals with `maximumFractionDigits: 1` and no forced trailing zero. Examples:

- `2517` renders as `2,517`;
- `2517.5` renders as `2,517.5`.

The score column remains a native table cell so the recently fixed continuous
row divider does not regress. Mobile and desktop column widths remain unchanged
unless browser QA proves that a half-step score clips.

## Supabase Snapshot

The existing ranking score columns and generated row-input columns use Postgres
`numeric`, so they already store exact half-step values. No schema migration or
RLS/grant change is needed. Generate and publish a fresh immutable v7 snapshot,
then verify the public `latest_national_rankings` view returns v7 metadata and
fractional values without coercion.

The Supabase breaking-change scan found no change relevant to existing numeric
columns or this read-only snapshot publication path. The public view and current
Data API exposure remain unchanged.

## Chevron Design

Render one decorative inline SVG inside `.national-ranking-row-chevron`. Use a
two-segment stroked path with rounded caps and joins. Give the path a taller,
sharper right-facing point than the current CJK bracket glyph. The wrapper keeps
the current desktop and mobile spacing and rotates `90deg` when the row expands.

The SVG uses `currentColor`, so light and dark theme contrast continues to come
from `--national-accent`. The wrapper remains `aria-hidden="true"`; the row's
existing disclosure button continues to carry the accessible name and expanded
state.

## Testing And Verification

- Add failing formula tests for v7 identity, weights, and exact latest/previous
  Yanggu champion scores (`577.5`, `412.5`, and `165`).
- Add failing calculation and seed-plan tests for v7 ranks, half-step values,
  metadata, and generated SQL.
- Add a UI test proving integer scores omit `.0` and half-step scores retain
  `.5`.
- Add a UI test proving the SVG chevron replaces the `〉` text glyph while the
  expansion state still rotates the wrapper.
- Run focused tests, then `npm test`, `npm run lint`, and `npm run build`.
- Publish the v7 Supabase snapshot and query the public view for formula version,
  Neutinamu women's points/rank, and a fractional score.
- Inspect the national ranking in mobile and desktop widths, in light and dark
  themes. Confirm score alignment, one continuous divider, the narrower closed
  chevron, the downward expanded chevron, and no hover regression.

## Out Of Scope

- Tournament prestige, stage scores, source results, crown rules, and ranking
  tie-break order do not change.
- Campus singles rankings and match results do not change.
- No new database table, column, function, policy, or permission is introduced.
