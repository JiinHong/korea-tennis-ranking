# Campus Ranking Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠퍼스 랭킹 홈을 현재 TOP 3, 최근 30일 기록, 전체 랭킹 순서로 재구성한다.

**Architecture:** 브라우저에서도 안전하게 사용할 수 있는 순수 집계 함수를 `lib/campusRankingHighlights.ts`에 둔다. `ClubRankingClient`는 API가 이미 반환하는 현재 선수와 경기 배열을 이 함수에 전달하고, 표현과 이동 로그만 담당한다.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Vitest, Testing Library, CSS

## Global Constraints

- 홈 화면의 최근 경기 카드와 별도 활동 피드를 제거한다.
- 현재 TOP 3는 2위, 1위, 3위 순서의 시상대형 한 행으로 표시한다.
- 최근 30일 기록은 최다 출전, 최다 승리, 최다 방어를 세로 3행으로 표시한다.
- 전체 랭킹 제목 오른쪽에 `최근 경기 보기 →`를 표시한다.
- 모든 동작은 서울과기대와 PETC 공통 컴포넌트에 적용한다.
- production 코드를 작성하기 전에 실패하는 테스트를 먼저 확인한다.

---

### Task 1: Recent 30-Day Highlight Aggregation

**Files:**
- Create: `lib/campusRankingHighlights.ts`
- Test: `lib/campusRankingHighlights.test.ts`

**Interfaces:**
- Consumes: `players` with `rank`, `name`, `wins`, `losses`, `matches`; `matches` with `date`, `challenger`, `defender`, `winner`
- Produces: `buildRecent30Highlights(players, matches, now): Recent30Highlight[]`

- [ ] **Step 1: Write the failing aggregation tests**

Test a fixed `2026-07-29` clock with matches inside and outside the 30-day range. Assert appearances, wins, successful defenses, and rank-based tie breaking.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- lib/campusRankingHighlights.test.ts`

Expected: FAIL because `campusRankingHighlights` does not exist.

- [ ] **Step 3: Implement the smallest pure aggregation function**

Parse dotted or dashed dates by numeric components, ignore malformed/out-of-range matches, count known active players, and return only positive leaders.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- lib/campusRankingHighlights.test.ts`

Expected: PASS.

### Task 2: Replace Home Feed With Approved Highlights

**Files:**
- Modify: `app/[club]/ClubRankingClient.tsx`
- Test: `app/[club]/ClubRankingClient.test.tsx`

**Interfaces:**
- Consumes: `buildRecent30Highlights` from Task 1
- Produces: `현재 TOP 3`, `최근 30일 기록`, and `최근 경기 보기 →` UI

- [ ] **Step 1: Write failing component tests**

Assert that the TOP 3 order is 2, 1, 3; recent leaders show their values; recent match cards and `활동 피드` are absent; `최근 경기 보기 →` links to `/${club.slug}/matches`; and the three sections appear in the approved order.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- app/[club]/ClubRankingClient.test.tsx`

Expected: FAIL because the approved highlight sections do not exist.

- [ ] **Step 3: Implement the new structure**

Remove `MatchListSection` and `hotPlayers`, render linked podium players, render the recent record rows, and add the match history text link with Amplitude tracking.

- [ ] **Step 4: Run the component test and verify GREEN**

Run: `npm test -- app/[club]/ClubRankingClient.test.tsx`

Expected: PASS.

### Task 3: Implement Responsive Highlight Styling

**Files:**
- Modify: `app/globals.css`
- Test: `app/globals.test.ts`

**Interfaces:**
- Consumes: CSS class names introduced in Task 2
- Produces: stable desktop and mobile podium, record rows, and ranking heading layout

- [ ] **Step 1: Replace obsolete CSS assertions with failing highlight assertions**

Assert the three-column podium, enlarged first place, vertical record row grid, full ranking heading alignment, and mobile-safe typography.

- [ ] **Step 2: Run the CSS test and verify RED**

Run: `npm test -- app/globals.test.ts`

Expected: FAIL because the new selectors do not exist.

- [ ] **Step 3: Add minimal responsive CSS and remove obsolete campus feed rules**

Implement the approved visual tokens and spacing without nested cards, while preserving existing ranking row styles.

- [ ] **Step 4: Run the CSS test and verify GREEN**

Run: `npm test -- app/globals.test.ts`

Expected: PASS.

### Task 4: Full Verification And Delivery

**Files:**
- Verify only

**Interfaces:**
- Consumes: Tasks 1-3
- Produces: tested and deployed-ready implementation

- [ ] **Step 1: Run all automated checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Inspect desktop and mobile**

Open the Seoultech and PETC pages at desktop and 390px mobile widths. Verify no overlap, TOP 3 order, recent records, ranking proximity, and recent-match navigation.

- [ ] **Step 3: Commit and push**

```bash
git add app/[club]/ClubRankingClient.tsx app/[club]/ClubRankingClient.test.tsx app/globals.css app/globals.test.ts lib/campusRankingHighlights.ts lib/campusRankingHighlights.test.ts docs/superpowers
git commit -m "feat: focus campus ranking home on highlights"
git push
```
