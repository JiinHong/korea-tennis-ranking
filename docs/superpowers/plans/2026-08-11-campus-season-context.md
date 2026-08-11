# Campus Season Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단식 랭킹 카드와 캠퍼스 랭킹에 누적·시즌별 경기 수를 표시하고, 최근 5경기의 빈칸만 과거 시즌 결과로 보충한다.

**Architecture:** `rankingData`가 현재·과거 경기에서 시즌 요약과 표시용 최근 폼을 계산해 기존 랭킹 API에 포함한다. 전국 랭킹은 별도의 캐시된 프로모션 통계 함수에서 두 동아리의 시즌 합계를 받아 카드에 전달한다. UI는 현재 결과와 과거 결과를 동일한 아이콘으로 렌더링하되 과거 결과에 전용 클래스를 부여한다.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Supabase

## Global Constraints

- 시즌3 결과를 먼저 유지하고 남는 빈칸만 시즌2·시즌1 기록으로 채운다.
- 과거 기록이 없는 선수의 빈 원은 유지한다.
- 데이터베이스 스키마와 저장 데이터는 변경하지 않는다.
- 모바일·데스크톱과 라이트·다크 모드를 모두 검수한다.

---

### Task 1: 시즌 요약과 표시용 최근 폼 계산

**Files:**
- Modify: `lib/campusRanking/rankingData.ts`
- Test: `lib/campusRanking/rankingDataForClub.test.ts`

**Interfaces:**
- Consumes: 현재 시즌 `MatchRecord[]`, 과거 시즌 `HistoricalMatchRecord[]`, 현재 시즌 이름
- Produces: `seasonSummaries: { name: string; matches: number; isCurrent: boolean }[]`와 선수별 `recentForm: { result: "W" | "L"; season: string; isHistorical: boolean }[]`

- [ ] **Step 1: Write the failing tests**

현재 결과가 두 개일 때 과거 최신 결과를 최대 세 개만 앞에 붙이고, 과거 결과가 없으면 현재 결과 외의 칸을 만들지 않는 테스트를 추가한다. 시즌 요약은 현재 경기와 과거 경기의 시즌별 개수를 반환해야 한다.

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run lib/campusRanking/rankingDataForClub.test.ts`

Expected: `recentForm`과 `seasonSummaries`가 없어 실패한다.

- [ ] **Step 3: Implement minimal data calculation**

현재 결과는 최대 5개까지 유지하고, 필요한 수만큼 과거 경기의 날짜순 최신 결과를 골라 `isHistorical: true`로 표시한다. 시즌별 경기 수를 그룹화하고 현재 시즌을 첫 항목으로 반환한다.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run lib/campusRanking/rankingDataForClub.test.ts`

Expected: 모든 테스트 통과.

### Task 2: 캠퍼스 랭킹에 시즌 문맥 표시

**Files:**
- Modify: `app/[club]/_components/ClubRankingClient.tsx`
- Modify: `app/globals.css`
- Test: `app/[club]/_components/ClubRankingClient.test.tsx`
- Test: `app/globals.test.ts`

**Interfaces:**
- Consumes: Task 1의 `seasonSummaries`와 `recentForm`
- Produces: 현재 시즌 경기 레이블, 과거 시즌 요약 줄, 과거 결과 전용 `.is-historical` 스타일과 시즌 툴팁, 선수 행 오른쪽 꺾쇠

- [ ] **Step 1: Write the failing component and style tests**

`시즌3 경기`, `시즌2 154경기 · 시즌1 30경기`, 현재·과거 결과 아이콘 수, 과거 아이콘 클래스, 과거 기록이 없을 때 빈 원 유지 여부를 검증한다. 과거 아이콘의 버튼 접근성 이름과 `role="tooltip"` 문구, 선수 행 오른쪽 `ChevronRight` SVG도 검증한다.

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run app/[club]/_components/ClubRankingClient.test.tsx app/globals.test.ts`

Expected: 시즌 문구와 과거 결과 클래스가 없어 실패한다.

- [ ] **Step 3: Implement the UI**

API 응답의 시즌 데이터를 상태로 저장하고, 현재 경기 수 레이블에 시즌명을 붙인다. 과거 시즌 요약은 과거 시즌이 있을 때만 렌더링한다. `RecentForm`은 `recentForm`을 우선 사용하고 기존 응답에는 현재 시즌 `recent5`를 대체값으로 사용한다. 과거 결과는 포커스 가능한 버튼으로 감싸고 왕관과 같은 호버·포커스·터치 툴팁 동작을 제공한다. 선수 행에는 작은 `ChevronRight`를 마지막 열에 배치한다.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run app/[club]/_components/ClubRankingClient.test.tsx app/globals.test.ts`

Expected: 모든 테스트 통과.

### Task 3: 전국 랭킹 카드 누적 경기 수와 꺾쇠

**Files:**
- Create: `lib/campusRanking/promotionStats.ts`
- Create: `lib/campusRanking/promotionStats.test.ts`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/_components/national-ranking/CampusRankingPromotion.tsx`
- Modify: `app/_components/national-ranking/CampusRankingPromotion.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `getRankingDataForClub`의 `seasonSummaries`
- Produces: `{ petc?: number; seoultech?: number }` 형태의 캐시된 누적 경기 수

- [ ] **Step 1: Write the failing data and component tests**

두 동아리의 시즌 합계가 각각 카드에 `누적 N경기`로 표시되고, 학교 링크의 장식 요소가 문자 화살표 없이 `ChevronRight` SVG를 포함하는지 검증한다. 통계 조회 실패 시 전국 랭킹은 유지되고 누적 문구만 생략되는 경우도 검증한다.

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run lib/campusRanking/promotionStats.test.ts app/_components/national-ranking/CampusRankingPromotion.test.tsx app/page.test.tsx`

Expected: 통계 함수, 누적 문구, 꺾쇠 아이콘이 없어 실패한다.

- [ ] **Step 3: Implement the cached stats and card UI**

두 동아리 데이터를 독립적으로 읽어 시즌 합계를 계산하고, 실패한 동아리는 값에서 제외한다. 카드 제목과 누적 문구를 세로 묶음으로 만들고 `lucide-react`의 `ChevronRight`를 사용한다.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run lib/campusRanking/promotionStats.test.ts app/_components/national-ranking/CampusRankingPromotion.test.tsx app/page.test.tsx`

Expected: 모든 테스트 통과.

### Task 4: 전체 검증과 배포

**Files:**
- Verify all modified files

**Interfaces:**
- Consumes: Tasks 1–3의 완성된 기능
- Produces: 검증된 커밋과 배포

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: 모든 명령이 종료 코드 0으로 완료된다.

- [ ] **Step 2: Run browser verification**

전국 랭킹과 `/seoultech`, `/petc`를 모바일·데스크톱, 라이트·다크 모드에서 확인한다. 느티나무의 시즌 요약, 빈칸 보존, 과거 결과 흐림, 카드 꺾쇠와 누적 경기 문구를 확인한다.

- [ ] **Step 3: Commit and push**

변경 파일을 검토한 뒤 기능을 설명하는 커밋을 만들고 `origin/main`에 푸시한다. 배포가 준비 상태가 되고 운영 도메인이 HTTP 200을 반환하는지 확인한다.
