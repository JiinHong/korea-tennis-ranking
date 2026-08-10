# Campus Ranking Polish and Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve campus singles ranking readability in both themes and add a subtle national-ranking entry point for the two active campus rankings and the free-operation inquiry chat.

**Architecture:** Keep the existing `MatchOutcomeIcon` and ranking row markup, and express the visual changes through scoped CSS. Add one presentational server component under the national-ranking component directory and render it only after a published ranking table.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, CSS

## Global Constraints

- Use the exact heading `단식 랭킹 운영 중!`.
- Link PETC to `/petc` and 느티나무 to `/seoultech`.
- Link `우리 동아리도 운영해보기` to `https://open.kakao.com/o/sFSnlgIi` in a new tab with `noopener noreferrer`.
- Do not use circular logo backgrounds.
- Preserve each university mark's source aspect ratio.
- PETC mark is dark in light mode and light in dark mode; the SeoulTech symbol keeps its source colors.
- Verify mobile and desktop in light and dark modes.

---

### Task 1: Add the national-ranking operation guide

**Files:**
- Create: `app/_components/national-ranking/CampusRankingPromotion.tsx`
- Create: `app/_components/national-ranking/CampusRankingPromotion.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: existing `/petc`, `/seoultech`, `/petc-logo.png`, and `/seoultech-symbol.png` routes/assets.
- Produces: `CampusRankingPromotion(): JSX.Element`, rendered after `NationalRankingTable` only when ranking data exists.

- [ ] **Step 1: Write failing component and page tests**

```tsx
expect(screen.getByRole("heading", { name: "단식 랭킹 운영 중!" })).toBeDefined();
expect(screen.getByRole("link", { name: "PETC 단식 랭킹" }).getAttribute("href")).toBe("/petc");
expect(screen.getByRole("link", { name: "느티나무 단식 랭킹" }).getAttribute("href")).toBe("/seoultech");
const inquiry = screen.getByRole("link", { name: /우리 동아리도 운영해보기/ });
expect(inquiry.getAttribute("href")).toBe("https://open.kakao.com/o/sFSnlgIi");
expect(inquiry.getAttribute("target")).toBe("_blank");
expect(inquiry.getAttribute("rel")).toBe("noopener noreferrer");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run app/_components/national-ranking/CampusRankingPromotion.test.tsx app/page.test.tsx`

Expected: FAIL because the component and links do not exist.

- [ ] **Step 3: Implement the minimal component and page placement**

Create a data-driven pair of `Link` elements with decorative `Image` children, then render the component directly after the table suspense boundary.

- [ ] **Step 4: Add failing CSS contract tests**

Assert a transparent, border-top-only outer section; two desktop columns; one mobile column; no logo background or border radius; exact logo widths; PETC-only dark filter; and transparent dark hover colors.

- [ ] **Step 5: Run CSS tests and verify RED**

Run: `npm test -- --run app/globals.test.ts`

Expected: FAIL because the new selectors are absent.

- [ ] **Step 6: Implement minimal responsive/theme CSS**

Use `62px` logo columns on mobile, PETC width `52px`, SeoulTech width `57px`, `height: auto`, and a PETC-only dark filter.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- --run app/_components/national-ranking/CampusRankingPromotion.test.tsx app/page.test.tsx app/globals.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 8: Commit**

```bash
git add app/_components/national-ranking/CampusRankingPromotion.tsx app/_components/national-ranking/CampusRankingPromotion.test.tsx app/page.tsx app/page.test.tsx app/globals.css app/globals.test.ts
git commit -m "feat: surface active campus singles rankings"
```

### Task 2: Remove outcome circles and center player information

**Files:**
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`
- Test: `app/[club]/_components/MatchOutcomeIcon.test.tsx`
- Test: `app/[club]/_components/ClubRankingClient.test.tsx`

**Interfaces:**
- Consumes: unchanged `MatchOutcomeIcon({ result, className })` markup.
- Produces: background-free colored icons while preserving `aria-label`, and centered `.player-cell` layout.

- [ ] **Step 1: Replace old CSS assertions with failing desired assertions**

Assert transparent icon backgrounds, `border-radius: 0`, larger SVG occupancy, green/red light and dark colors, and a flex-centered `.player-cell`. At responsive breakpoints assert the player cell spans both grid rows.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run app/globals.test.ts app/[club]/_components/MatchOutcomeIcon.test.tsx app/[club]/_components/ClubRankingClient.test.tsx`

Expected: FAIL on the existing circular icon and row alignment CSS.

- [ ] **Step 3: Implement minimal CSS changes**

Keep empty placeholders circular, but remove backgrounds from `.match-outcome-icon`. Increase SVG size from `60%` to `84%`. Make `.player-cell` a centered column and span two rows in responsive ranking grids without changing DOM order.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command from Step 2.

Expected: all selected tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/globals.test.ts app/[club]/_components/MatchOutcomeIcon.test.tsx app/[club]/_components/ClubRankingClient.test.tsx
git commit -m "fix: simplify campus ranking result indicators"
```

### Task 3: Restore the open player-detail surface in dark mode

**Files:**
- Modify: `app/globals.css`
- Modify: `app/globals.test.ts`

**Interfaces:**
- Consumes: existing `.player-detail-panel` and `.recent-match-item` structure.
- Produces: transparent dark-mode content surfaces matching light mode.

- [ ] **Step 1: Add failing dark-mode surface tests**

Assert `.dark .player-detail-panel` and `.dark .recent-match-item` use transparent backgrounds and that the panel is no longer grouped with dark surface cards.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run app/globals.test.ts`

Expected: FAIL because both selectors currently use dark surface backgrounds.

- [ ] **Step 3: Implement the scoped dark-mode overrides**

Remove `.player-detail-panel` from the shared dark surface rule, remove the standalone recent-match background, and add explicit transparent overrides.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- --run app/globals.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "fix: open player detail layout in dark mode"
```

### Task 4: Verify the complete experience and ship

**Files:**
- Verify only.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified branch ready for `main`.

- [ ] **Step 1: Run full automated verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits `0`, and Next.js production build exits `0`.

- [ ] **Step 2: Run browser QA**

Verify `/`, `/seoultech`, `/seoultech/players/<known-player>`, and `/petc` at desktop and mobile widths in light and dark modes. Check icons, row centering, logo contrast, hover colors, link targets, and horizontal overflow.

- [ ] **Step 3: Review the diff and commit any verified polish**

Run: `git diff --check` and inspect `git diff main...HEAD`.

- [ ] **Step 4: Merge, push, and verify production**

Fast-forward `main`, push to `origin/main`, wait for the Vercel production deployment, publish the pending `national-club-v7` snapshot, and verify the public pages and database snapshot.
