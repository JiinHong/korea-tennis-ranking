# Match Result Icons and Vertical Scores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace visible W/L letters with accessible check/X icons and rebuild the full match log as ATP-style stacked player rows with per-player scores.

**Architecture:** Add one shared `MatchOutcomeIcon` component for circular win/loss results used by the main ranking and player detail. Keep the full match log's winner treatment separate because it uses a plain ATP-style check, and derive each player's displayed score from the existing `winnerScore:loserScore` string without changing stored data or APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, lucide-react, CSS, Vitest, Testing Library.

## Global Constraints

- Remove visible `W` and `L` text from `/{club}`, `/{club}/matches`, and `/{club}/players/{player}`.
- Full match rows keep challenger then defender order but do not show `W`, `L`, `vs`, `도전자`, `방어자`, or `OOO 승`.
- Full match rows show a plain green check only beside the winner's name.
- Full match ranks render as `(number)` and missing ranks render as `(–)`.
- The stored score contract remains `winnerScore:loserScore`; map the winner score to `match.winner` and the loser score to the other player.
- Main-ranking recent form and player-detail recent matches use a green circle with a white check for wins and a red circle with a white X for losses.
- Main-ranking empty recent-form slots remain gray, and each ranking row retains exactly five slots.
- Preserve all existing ranking calculations, APIs, analytics events, links, match ordering, date, defense-result, opponent, season, and role data outside the explicitly removed full-match labels.
- Use Korean `승리`/`패배` or `승자` accessibility names while hiding decorative SVGs from assistive technology.
- Verify Seoultech and PETC on desktop/mobile in light/dark mode.

---

### Task 1: Create the shared circular outcome icon

**Files:**
- Create: `app/[club]/_components/MatchOutcomeIcon.test.tsx`
- Create: `app/[club]/_components/MatchOutcomeIcon.tsx`

**Interfaces:**
- Consumes: `result: "W" | "L"` and optional `className?: string`.
- Produces: `MatchOutcomeIcon`, a labeled span with `match-outcome-icon`, `is-win`/`is-loss`, and an aria-hidden Lucide `Check`/`X` SVG.

- [ ] **Step 1: Write the failing component tests**

Create `MatchOutcomeIcon.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MatchOutcomeIcon from "./MatchOutcomeIcon";

describe("MatchOutcomeIcon", () => {
  it("승리를 W 없이 초록 체크 결과로 표시한다", () => {
    const { container } = render(
      <MatchOutcomeIcon className="form-dot" result="W" />
    );

    expect(screen.getByLabelText("승리")).toBeDefined();
    expect(screen.queryByText("W")).toBeNull();
    expect(container.querySelector(".match-outcome-icon.is-win.form-dot svg"))
      .not.toBeNull();
  });

  it("패배를 L 없이 빨간 X 결과로 표시한다", () => {
    const { container } = render(<MatchOutcomeIcon result="L" />);

    expect(screen.getByLabelText("패배")).toBeDefined();
    expect(screen.queryByText("L")).toBeNull();
    expect(container.querySelector(".match-outcome-icon.is-loss svg"))
      .not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- 'app/[club]/_components/MatchOutcomeIcon.test.tsx'`

Expected: FAIL because `MatchOutcomeIcon.tsx` does not exist.

- [ ] **Step 3: Implement the minimal shared component**

Create `MatchOutcomeIcon.tsx`:

```tsx
import { Check, X } from "lucide-react";

type MatchOutcomeIconProps = {
  result: "W" | "L";
  className?: string;
};

export default function MatchOutcomeIcon({
  result,
  className = "",
}: MatchOutcomeIconProps) {
  const isWin = result === "W";
  const Icon = isWin ? Check : X;
  const classes = [
    "match-outcome-icon",
    isWin ? "is-win" : "is-loss",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span aria-label={isWin ? "승리" : "패배"} className={classes} title={isWin ? "승" : "패"}>
      <Icon aria-hidden="true" />
    </span>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- 'app/[club]/_components/MatchOutcomeIcon.test.tsx'`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the shared component**

```bash
git add 'app/[club]/_components/MatchOutcomeIcon.tsx' 'app/[club]/_components/MatchOutcomeIcon.test.tsx'
git commit -m "feat: add accessible match outcome icons"
```

---

### Task 2: Replace main-ranking W/L slots

**Files:**
- Modify: `app/[club]/_components/ClubRankingClient.test.tsx`
- Modify: `app/[club]/_components/ClubRankingClient.tsx`

**Interfaces:**
- Consumes: Task 1 `MatchOutcomeIcon` and existing `recent5: string[]` values.
- Produces: five recent-form slots per player, with circular icons for played results and unchanged gray blank slots.

- [ ] **Step 1: Write the failing ranking behavior assertions**

In the test fixture whose played row has `recent5: ["W", "L"]`, add:

```tsx
expect(within(playedRow).getByLabelText("승리")).toBeDefined();
expect(within(playedRow).getByLabelText("패배")).toBeDefined();
expect(within(playedRow).queryByText("W")).toBeNull();
expect(within(playedRow).queryByText("L")).toBeNull();
expect(playedRow.querySelectorAll(".form-dot")).toHaveLength(5);
```

- [ ] **Step 2: Run the ranking test to verify it fails**

Run: `npm test -- 'app/[club]/_components/ClubRankingClient.test.tsx'`

Expected: FAIL because the result slots still render visible W/L letters.

- [ ] **Step 3: Render the shared icon from `RecentForm`**

Import `MatchOutcomeIcon` and replace each played-result span with:

```tsx
<MatchOutcomeIcon
  className="form-dot"
  key={`${result}-${index}`}
  result={result === "W" ? "W" : "L"}
/>
```

Keep the existing blank-slot map unchanged.

- [ ] **Step 4: Run the ranking and icon tests**

Run: `npm test -- 'app/[club]/_components/ClubRankingClient.test.tsx' 'app/[club]/_components/MatchOutcomeIcon.test.tsx'`

Expected: both files PASS, including five-slot behavior.

- [ ] **Step 5: Commit the ranking result icons**

```bash
git add 'app/[club]/_components/ClubRankingClient.tsx' 'app/[club]/_components/ClubRankingClient.test.tsx'
git commit -m "feat: replace ranking form letters with icons"
```

---

### Task 3: Replace player-detail W/L results

**Files:**
- Modify: `app/[club]/players/[player]/page.test.tsx`
- Modify: `app/[club]/_components/PlayerDetailView.tsx`

**Interfaces:**
- Consumes: Task 1 `MatchOutcomeIcon` and `recentMatches[].result`.
- Produces: unchanged player-detail recent rows whose leading result is a circular icon with an accessible Korean name.

- [ ] **Step 1: Write the failing player-detail assertions**

Extend the detail fixture with one `result: "L"` recent match, then assert:

```tsx
expect(screen.getByLabelText("승리")).toBeDefined();
expect(screen.getByLabelText("패배")).toBeDefined();
expect(screen.queryByText("W")).toBeNull();
expect(screen.queryByText("L")).toBeNull();
expect(container.querySelectorAll(".result-letter.match-outcome-icon"))
  .toHaveLength(2);
```

- [ ] **Step 2: Run the player page test to verify it fails**

Run: `npm test -- 'app/[club]/players/[player]/page.test.tsx'`

Expected: FAIL because recent rows still render W/L text.

- [ ] **Step 3: Use `MatchOutcomeIcon` in recent rows**

Import the shared component and replace the current result-letter span with:

```tsx
<MatchOutcomeIcon
  className="result-letter"
  result={match.result === "W" ? "W" : "L"}
/>
```

Leave opponent, season/date/role, and right-aligned score markup unchanged.

- [ ] **Step 4: Run player-detail and icon tests**

Run: `npm test -- 'app/[club]/players/[player]/page.test.tsx' 'app/[club]/_components/MatchOutcomeIcon.test.tsx'`

Expected: all tests PASS.

- [ ] **Step 5: Commit player-detail icons**

```bash
git add 'app/[club]/_components/PlayerDetailView.tsx' 'app/[club]/players/[player]/page.test.tsx'
git commit -m "feat: unify player match result icons"
```

---

### Task 4: Rebuild the full match log as stacked player scores

**Files:**
- Modify: `app/[club]/matches/page.test.tsx`
- Modify: `app/[club]/_components/MatchListSection.tsx`

**Interfaces:**
- Consumes: `MatchRecord`, with `score` as `winnerScore:loserScore` and `winner` as a player name.
- Produces: `getPlayerScores(match): { challenger: string; defender: string } | null`, ATP-style `club-match-player-row` elements, and one plain `match-winner-check` beside the winner.

- [ ] **Step 1: Write the failing stacked-score tests**

For the existing challenger-win and defender-win fixtures, locate each player row and assert:

```tsx
const kimDohunRow = screen.getByText("김도훈").closest(".club-match-player-row");
const ohJunseokRow = screen.getByText("오준석").closest(".club-match-player-row");
const parkJonggeonRow = screen.getByText("박종건").closest(".club-match-player-row");
const kimSunwooRow = screen.getByText("김선우").closest(".club-match-player-row");

expect(within(kimDohunRow as HTMLElement).getByText("(2)")).toBeDefined();
expect(within(kimDohunRow as HTMLElement).getByText("6")).toBeDefined();
expect(within(kimDohunRow as HTMLElement).getByLabelText("승자")).toBeDefined();
expect(within(ohJunseokRow as HTMLElement).getByText("4")).toBeDefined();
expect(within(ohJunseokRow as HTMLElement).queryByLabelText("승자")).toBeNull();
expect(within(parkJonggeonRow as HTMLElement).getByText("3")).toBeDefined();
expect(within(kimSunwooRow as HTMLElement).getByText("6")).toBeDefined();
expect(within(kimSunwooRow as HTMLElement).getByLabelText("승자")).toBeDefined();
expect(screen.queryByText("W")).toBeNull();
expect(screen.queryByText("L")).toBeNull();
expect(screen.queryByText("vs")).toBeNull();
expect(screen.queryByText("김도훈 승")).toBeNull();
expect(screen.queryByText("김선우 승")).toBeNull();
expect(screen.queryByText(/도전자 ·/)).toBeNull();
expect(screen.queryByText(/방어자 ·/)).toBeNull();
```

Add a separate fixture with `challengerRank: null`, `score: "기권"`, and an unknown winner; assert `(–)` and `기권` remain visible and no winner check appears.

- [ ] **Step 2: Run the matches page test to verify it fails**

Run: `npm test -- 'app/[club]/matches/page.test.tsx'`

Expected: FAIL because the old W/L, role, vs, combined score, and winner-copy layout is still rendered.

- [ ] **Step 3: Implement score mapping and stacked markup**

In `MatchListSection.tsx`, import `Check`, remove `getPlayerResult`, and add:

```tsx
function getPlayerScores(match: MatchRecord) {
  const parsedScore = match.score.match(/^\s*(\d+)\s*:\s*(\d+)\s*$/);

  if (!parsedScore) {
    return null;
  }

  const [, winnerScore, loserScore] = parsedScore;

  if (match.winner === match.challenger) {
    return { challenger: winnerScore, defender: loserScore };
  }

  if (match.winner === match.defender) {
    return { challenger: loserScore, defender: winnerScore };
  }

  return null;
}

function formatRank(rank: number | null) {
  return rank === null ? "–" : String(rank);
}
```

Render each player with this structure:

```tsx
<div className="club-match-player-row">
  <span className="club-match-player-identity">
    <strong>{name}</strong>
    <span className="club-match-player-rank">({formatRank(rank)})</span>
    {isWinner ? (
      <span aria-label="승자" className="match-winner-check">
        <Check aria-hidden="true" />
      </span>
    ) : null}
  </span>
  {score ? <strong className="club-match-player-score">{score}</strong> : null}
</div>
```

Render challenger then defender, remove the result letters, `vs`, role labels, combined score block, and winner-copy block. If `getPlayerScores` returns `null`, render `<span className="club-match-score-fallback">{match.score}</span>` once after the two player rows.

- [ ] **Step 4: Run the matches page tests**

Run: `npm test -- 'app/[club]/matches/page.test.tsx'`

Expected: all match-page tests PASS for challenger win, defender win, missing rank, malformed score, and unknown winner.

- [ ] **Step 5: Commit the stacked result structure**

```bash
git add 'app/[club]/_components/MatchListSection.tsx' 'app/[club]/matches/page.test.tsx'
git commit -m "feat: stack match players with individual scores"
```

---

### Task 5: Style icons and ATP-style match rows responsively

**Files:**
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Tasks 1–4 class names.
- Produces: common circular result colors, plain winner check styling, full-width stacked match rows, fixed right score alignment, and dark/mobile adjustments.

- [ ] **Step 1: Write the failing CSS contract tests**

Replace the W/L-specific contracts with checks for:

```ts
expect(css).toMatch(
  /\.match-outcome-icon\s*\{[^}]*display:\s*inline-flex;[^}]*color:\s*#fff;[^}]*border-radius:\s*999px;[^}]*\}/
);
expect(css).toMatch(
  /\.match-outcome-icon\.is-win\s*\{[^}]*background:\s*#187b42;[^}]*\}/
);
expect(css).toMatch(
  /\.match-outcome-icon\.is-loss\s*\{[^}]*background:\s*#d91e4d;[^}]*\}/
);
expect(css).toMatch(
  /\.match-winner-check\s*\{[^}]*color:\s*#18833f;[^}]*background:\s*transparent;[^}]*\}/
);
expect(css).toMatch(
  /\.club-match-player-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 34px;[^}]*\}/
);
expect(css).not.toContain(".match-result-letter");
expect(css).not.toContain(".match-versus");
expect(css).not.toContain(".club-match-score {");
```

Keep existing assertions for 22/19px desktop ranking slots, 18/16px mobile ranking slots, and gray empty slots. Update player-detail contracts to require a 26px `.result-letter.match-outcome-icon` circle instead of colored W/L text.

- [ ] **Step 2: Run the CSS test to verify it fails**

Run: `npm test -- app/globals.test.ts`

Expected: FAIL on old W/L colors and old three-column match-card layout.

- [ ] **Step 3: Implement the style system**

Add the common icon rules with 60% SVG size and strong strokes; use `#187b42` for wins and `#d91e4d` for losses. Preserve `.form-dot` and its existing responsive dimensions, preserve `.form-dot.is-empty`, and remove the old `.form-dot.is-win`, `.form-dot.is-loss`, `.result-letter.is-win`, `.result-letter.is-loss`, `.match-result-letter`, `.match-versus`, and `.club-match-score` rules.

Make `.club-match-card` one column, `.club-match-date` an inline date/status row, `.club-match-players` a vertical grid, and `.club-match-player-row` a `minmax(0, 1fr) 34px` grid. Use an inline-flex identity group with truncating names, muted parenthetical ranks, a 20px transparent green winner check, and right-aligned tabular scores. At `max-width: 560px`, keep the same structure with smaller gaps and no horizontal clipping. Give `.result-letter.match-outcome-icon` a 26px desktop and 24px mobile circle. Add dark-theme overrides that keep white icon strokes and increase the separation of gray empty slots.

- [ ] **Step 4: Run all affected tests**

Run: `npm test -- app/globals.test.ts 'app/[club]/_components/MatchOutcomeIcon.test.tsx' 'app/[club]/_components/ClubRankingClient.test.tsx' 'app/[club]/matches/page.test.tsx' 'app/[club]/players/[player]/page.test.tsx'`

Expected: all affected test files PASS.

- [ ] **Step 5: Commit the result styles**

```bash
git add app/globals.css app/globals.test.ts
git commit -m "feat: style match outcomes for every theme"
```

---

### Task 6: Verify and publish all accumulated work

**Files:**
- Verify: `app/icon.png`
- Verify: `app/page.tsx`
- Verify: `app/_components/national-ranking/NationalRankingTable.tsx`
- Verify: `app/[club]/_components/MatchListSection.tsx`
- Verify: `app/[club]/_components/ClubRankingClient.tsx`
- Verify: `app/[club]/_components/PlayerDetailView.tsx`
- Verify: `app/globals.css`

**Interfaces:**
- Consumes: all completed favicon, national-ranking, theme-link, and match-outcome commits on the feature branch.
- Produces: verified `main` equal to `origin/main`.

- [ ] **Step 1: Run the focused regression suite**

Run: `npm test -- app/layout.test.ts app/page.test.tsx app/_components/national-ranking/NationalRankingTable.test.tsx app/globals.test.ts 'app/[club]/_components/MatchOutcomeIcon.test.tsx' 'app/[club]/_components/ClubRankingClient.test.tsx' 'app/[club]/matches/page.test.tsx' 'app/[club]/players/[player]/page.test.tsx'`

Expected: every focused test PASS.

- [ ] **Step 2: Run the full verification suite**

Run: `npm test && npm run lint && npm run build`

Expected: all Vitest files, ESLint, and the Next.js production build PASS.

- [ ] **Step 3: Browser-verify light/dark and desktop/mobile**

Verify `/`, `/seoultech`, `/seoultech/matches`, and one Seoultech player detail in desktop light, desktop dark, mobile light, and mobile dark. Repeat the shared match/ranking checks on `/petc`, `/petc/matches`, and one PETC player detail. Confirm no visible W/L letters, correct check/X meanings, correctly mapped vertical player scores for challenger and defender wins, unclipped `(rank)` labels, readable dark colors, preserved links/interactions, no white hover flash, and the single 2:3 court favicon.

- [ ] **Step 4: Review the final diff and branch**

Run `git diff --check`, inspect `git status`, review every feature-branch commit relative to `main`, and make only narrowly scoped verification fixes with their own failing tests and commits.

- [ ] **Step 5: Finish and publish**

Use `superpowers:finishing-a-development-branch`, merge the feature branch into `main` as the user already requested, rerun `npm test && npm run lint && npm run build` on `main`, push `main`, and verify `git rev-parse HEAD` equals `git rev-parse origin/main`.
