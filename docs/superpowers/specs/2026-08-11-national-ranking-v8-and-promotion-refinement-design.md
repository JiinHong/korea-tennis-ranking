# National Ranking v8 and Promotion Refinement Design

## Goal

Apply the approved national-ranking refinements without changing source
results or the established campus-ranking page structure.

## Formula

- Keep `national-club-v7` immutable.
- Add and publish `national-club-v8` with recency units `4`, `2`, and `1`.
- Keep v7 stage and tournament units unchanged.
- Use integer arithmetic end to end, so every contribution and total is an integer.
- Update the methodology page and examples to the active v8 formula.

## National ranking UI

- Render a 90-degree collapsed row chevron using a square SVG coordinate box.
- Keep the existing 90-degree rotation when a row expands.
- Restore circular green win and red loss indicators in ranking recent form.
- Keep player-detail recent-match indicators unboxed and color-only.

## Campus ranking promotion

- Keep the heading `단식 랭킹 운영 중!`.
- Move `우리 동아리도 운영해보기 →` immediately below the heading and make
  it slightly larger.
- Show the two campus links below the inquiry link.
- Use the exact labels `고려대 PETC 단식 랭킹` and
  `서울과기대 느티나무 단식 랭킹`.
- Preserve the existing theme-aware logo treatments and destinations.

## Verification

- Drive each behavior with a failing automated test before implementation.
- Run the full test, lint, and production build suites.
- Inspect the national ranking and player detail on mobile and desktop in light
  and dark themes.
- Publish v8 only after deployment, then verify production formula and scores.
