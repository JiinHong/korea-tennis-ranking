# National Ranking Copy, Chevron, and Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the national-ranking service copy, simplify ranking rows to rank/club/score-with-chevron, correct the tournament-update link color, and replace the browser favicon with a legible pale-green vertical grass court.

**Architecture:** Keep the national page's existing server component and accessible row-disclosure behavior, changing only its copy and presentational table structure. Keep Next.js file-based favicon discovery through `app/icon.png`; use a behavior test to reject the old asset, then verify the generated court visually at browser-tab size.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS, Vitest, Testing Library, built-in image generation.

## Global Constraints

- The header description is exactly `최근 3년간 6개 대학 테니스 대회 성적을 반영한 랭킹입니다.`.
- The ranking table has exactly three columns: rank, club, and score with an adjacent chevron.
- Do not render a `성적` column header or the labels `성적 보기` and `성적 접기`.
- Preserve row-wide click behavior, the hidden named disclosure button, `aria-expanded`, honor-button click isolation, analytics, the operating badge, and expanded links.
- The favicon is a top-down, pale-light-green, solid-color court in an approximately 2:3 vertical rectangle with white court lines about three times thicker than the current asset and minimal outside margin.
- The favicon has no grass stripes, text, ball, racket, shadow, 3D effect, or watermark.
- Keep `app/favicon.ico` absent so the browser exposes only `app/icon.png`.
- The tournament-update link uses the normal campus text color instead of the green accent, rendering black in light mode and readable light text in dark mode.
- Verify desktop and mobile layouts in light and dark themes; hover must not turn rows white.

---

### Task 1: Generate and install the legible court favicon

**Files:**
- Modify: `app/layout.test.ts`
- Modify: `app/icon.png`

**Interfaces:**
- Consumes: Next.js file-based metadata convention for `app/icon.png`.
- Produces: one browser favicon whose SHA-256 differs from the old striped source asset.

- [ ] **Step 1: Write the failing asset regression test**

Replace the exact old-hash assertion with an explicit rejection of the old asset and retain the missing-ICO assertion:

```ts
const iconHash = createHash("sha256").update(icon).digest("hex");

expect(iconHash).not.toBe(
  "b0ad0de7ca64263b6f52fe5e038ea02ba560a676b3ff316b8a51e416f95c7d2a"
);
```

- [ ] **Step 2: Run the favicon test to verify it fails**

Run: `npm test -- app/layout.test.ts`

Expected: FAIL because `app/icon.png` still has SHA-256 `b0ad0de7ca64263b6f52fe5e038ea02ba560a676b3ff316b8a51e416f95c7d2a`.

- [ ] **Step 3: Edit the favicon with built-in image generation**

Use `app/icon.png` as the referenced image with this complete prompt:

```text
Use case: precise-object-edit. Asset type: browser favicon optimized for recognition at 16–32 px. Preserve a top-down tennis court in an approximately 2:3 vertical rectangular composition. Replace the striped dark grass with one flat pale light-green fill. Make every white outer, baseline, service, and center line about three times thicker than in the reference. Simplify the geometry and keep only a minimal margin outside the court so it reads immediately at tiny size. No grass stripes, texture, text, tennis ball, racket, shadow, 3D effect, or watermark. Do not make the canvas square.
```

Inspect the generated image at original size, select the version that best matches the prompt, and copy that exact PNG to `app/icon.png`.

- [ ] **Step 4: Run the favicon tests to verify they pass**

Run: `npm test -- app/layout.test.ts`

Expected: all root metadata tests PASS, including the changed-asset and missing-ICO checks.

- [ ] **Step 5: Commit the favicon**

```bash
git add app/icon.png app/layout.test.ts
git commit -m "fix: improve grass court favicon legibility"
```

---

### Task 2: Restore the national-ranking header copy

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: the existing `national-header-description` and `national-header-tournaments` styles.
- Produces: one service-data description followed by the existing tournament list.

- [ ] **Step 1: Write the failing copy test**

Update the published-ranking test to require the restored sentence and reject the temporary copy:

```ts
expect(
  screen.getByText(
    "최근 3년간 6개 대학 테니스 대회 성적을 반영한 랭킹입니다."
  )
).toBeDefined();
expect(
  screen.queryByText(
    "양구 대회 전에 각 학교의 최근 성적을 비교해 보면 재미있을 것 같아 정리해봤습니다."
  )
).toBeNull();
expect(screen.queryByText("최근 3년간 6개 대회 성적 반영")).toBeNull();
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- app/page.test.tsx`

Expected: FAIL because the temporary Yanggu copy is still rendered.

- [ ] **Step 3: Restore the production copy**

Render this exact description structure in `app/page.tsx`:

```tsx
<p className="national-header-description">
  <span>
    최근 3년간 6개 대학 테니스 대회 성적을 반영한 랭킹입니다.
  </span>
  <span className="national-header-tournaments">
    양구 · 경인지구 · 춘천 · 인제 · 영월 · WEMIX OPEN
  </span>
</p>
```

- [ ] **Step 4: Run the page test to verify it passes**

Run: `npm test -- app/page.test.tsx`

Expected: all home-page tests PASS.

- [ ] **Step 5: Commit the restored copy**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "fix: restore national ranking description"
```

---

### Task 3: Collapse the ranking table to three columns

**Files:**
- Modify: `app/_components/national-ranking/NationalRankingTable.test.tsx`
- Modify: `app/_components/national-ranking/NationalRankingTable.tsx`

**Interfaces:**
- Consumes: `row.points`, `isExpanded`, existing row click handler, hidden disclosure button, and `national-ranking-row-chevron` state selector.
- Produces: `.national-ranking-score` containing `.national-ranking-score-value` and `.national-ranking-row-chevron`, with detail and empty cells spanning three columns.

- [ ] **Step 1: Write the failing three-column structure test**

Replace the four-column test with assertions that locate the chevron inside the score cell and reject all action copy:

```ts
it("점수와 화살표를 같은 셀에 두고 세 열 구조를 유지한다", () => {
  const { container } = render(<NationalRankingTable rankings={rankings} />);
  const firstScore = screen.getByText("1,234").closest(
    ".national-ranking-score"
  );

  expect(screen.queryByRole("columnheader", { name: "성적" })).toBeNull();
  expect(screen.queryByText("성적 보기")).toBeNull();
  expect(screen.queryByText("성적 접기")).toBeNull();
  expect(firstScore?.querySelector(".national-ranking-row-chevron")).not.toBeNull();

  fireEvent.click(
    screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    })
  );
  expect(
    container
      .querySelector(".national-ranking-detail-row > td")
      ?.getAttribute("colspan")
  ).toBe("3");
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx`

Expected: FAIL because the separate action column and four-column spans still exist.

- [ ] **Step 3: Implement the three-column markup**

Use a three-column `colgroup`, remove the action header/cell, change both spans to `3`, and render this score cell:

```tsx
<td className="national-ranking-score">
  <span className="national-ranking-score-value">
    {scoreFormatter.format(row.points)}
  </span>
  <span aria-hidden="true" className="national-ranking-row-chevron">
    〉
  </span>
</td>
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run: `npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx`

Expected: all national ranking table tests PASS.

- [ ] **Step 5: Commit the table structure**

```bash
git add app/_components/national-ranking/NationalRankingTable.tsx app/_components/national-ranking/NationalRankingTable.test.tsx
git commit -m "fix: place ranking chevron beside score"
```

---

### Task 4: Align score and chevron responsively

**Files:**
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the Task 3 class names and existing `data-expanded="true"` selector.
- Produces: a 136px desktop score column and 94px mobile score column with compact score-chevron gaps.

- [ ] **Step 1: Write the failing CSS contract tests**

Require the new column widths and flex alignment, and reject the deleted action-column selectors:

```ts
expect(css).toMatch(
  /\.national-ranking-score-column\s*\{[\s\S]*?width:\s*136px;[^}]*\}/
);
expect(css).not.toContain(".national-ranking-action-column");
expect(css).toMatch(
  /\.national-ranking-score\s*\{[\s\S]*?display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*flex-end;[^}]*gap:\s*12px;[^}]*white-space:\s*nowrap;[^}]*\}/
);
expect(css).toMatch(
  /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-score-column\s*\{[^}]*width:\s*94px;[^}]*\}[\s\S]*?\.national-ranking-score\s*\{[^}]*gap:\s*8px;[^}]*\}/
);
```

- [ ] **Step 2: Run the CSS contract test to verify it fails**

Run: `npm test -- app/globals.test.ts`

Expected: FAIL on the old action-column rules and old widths.

- [ ] **Step 3: Implement desktop and mobile alignment**

Set `.national-ranking-score-column` to `136px`; make `.national-ranking-score` a right-justified flex row with `gap: 12px`; remove `.national-ranking-action-column`, `.national-ranking-row-action`, and their mobile rules; reset the chevron margin to `0`. In the `max-width: 640px` block, set the score column to `94px` and the score-cell gap to `8px`. Keep the existing expanded-row rotation and reduced-motion declarations.

- [ ] **Step 4: Run the CSS and component tests**

Run: `npm test -- app/globals.test.ts app/_components/national-ranking/NationalRankingTable.test.tsx`

Expected: both test files PASS.

- [ ] **Step 5: Commit the responsive styles**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "fix: tighten ranking score actions"
```

---

### Task 5: Correct the tournament-update link color

**Files:**
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the existing theme-aware `--campus-ink` custom property.
- Produces: `.campus-result-update-link` in the normal foreground color in both themes.

- [ ] **Step 1: Write the failing color contract test**

Change the existing exact CSS contract so the link requires the normal campus text color:

```ts
expect(css).toContain(
  ".campus-result-update-link {\n  display: inline-flex;\n  align-items: center;\n  margin-top: 9px;\n  color: var(--campus-ink);\n  font-size: 13px;\n  font-weight: 850;\n  text-decoration: none;\n}"
);
```

- [ ] **Step 2: Run the CSS contract test to verify it fails**

Run: `npm test -- app/globals.test.ts`

Expected: FAIL because `.campus-result-update-link` still uses `var(--campus-green)`.

- [ ] **Step 3: Use the theme-aware text color**

Change only the color declaration in `app/globals.css`:

```css
.campus-result-update-link {
  color: var(--campus-ink);
}
```

Keep the rule's existing layout, typography, arrow spacing, and hover motion declarations unchanged.

- [ ] **Step 4: Run the CSS contract test to verify it passes**

Run: `npm test -- app/globals.test.ts`

Expected: all global CSS contract tests PASS.

- [ ] **Step 5: Commit the link color**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "fix: neutralize tournament update link color"
```

---

### Task 6: Verify the complete experience and publish

**Files:**
- Verify: `app/icon.png`
- Verify: `app/page.tsx`
- Verify: `app/_components/national-ranking/NationalRankingTable.tsx`
- Verify: `app/globals.css`

**Interfaces:**
- Consumes: the completed favicon, header, table markup, and responsive styles.
- Produces: a tested commit on `main` pushed to `origin/main`.

- [ ] **Step 1: Run the focused regression suite**

Run: `npm test -- app/layout.test.ts app/page.test.tsx app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 2: Run the full automated verification**

Run: `npm test && npm run lint && npm run build`

Expected: the full Vitest suite, ESLint, and Next.js production build all PASS.

- [ ] **Step 3: Inspect the browser in every required state**

Start or reuse the local development server and verify `/` at desktop and mobile widths in light and dark themes. Confirm the original service copy, no `성적` header/action copy, compact score-chevron placement, right-to-down chevron rotation, unchanged badge/link behavior, no white hover flash, no clipping, and the single pale-green court favicon at tab size. Verify `/seoultech` in both themes and confirm the tournament-update link is black in light mode and uses the readable normal foreground in dark mode.

- [ ] **Step 4: Confirm browser metadata exposes one icon**

Inspect the page head and confirm exactly one icon link resolves to `/icon.png` and no `/favicon.ico` link exists.

- [ ] **Step 5: Review and publish**

Run `git diff --check`, inspect the final diff, commit any verification-driven adjustment in a narrowly scoped commit, merge the feature branch into `main`, rerun the full automated verification on `main`, push `main`, and verify `git rev-parse HEAD` equals `git rev-parse origin/main`.
