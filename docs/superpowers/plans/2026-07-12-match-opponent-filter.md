# Match Opponent Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 경기 결과 입력에서 한 선수를 선택하면 반대쪽에는 서버가 허용한 위·아래 순위 범위의 선수만 표시한다.

**Architecture:** 경기 옵션 API가 현재 시즌의 `challengeRange`를 선수 목록과 함께 반환한다. 클라이언트는 순위순 활동 선수 배열의 인덱스를 사용해 양쪽 선택창의 후보를 계산하며, 서버 트랜잭션 검증은 최종 안전장치로 유지한다.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library

## Global Constraints

- UI 범위는 하드코딩하지 않고 API가 반환한 `challengeRange`를 사용한다.
- 활성 선수 배열의 순서를 기준으로 위·아래 범위를 계산해 백엔드 규칙과 일치시킨다.
- 선수 1과 선수 2 중 어느 쪽을 먼저 골라도 동일하게 동작한다.
- 프로덕션 코드를 작성하기 전에 실패 테스트를 확인한다.

---

### Task 1: API에 도전 범위 포함

**Files:**
- Modify: `app/api/clubs/[club]/matches/route.test.ts`
- Modify: `app/api/clubs/[club]/matches/route.ts`

**Interfaces:**
- Consumes: `getSupabaseMatchValidationContext(clubSlug)`의 `config.challengeRange`
- Produces: `{ ok: true, players: MatchOption[], challengeRange: number }`

- [ ] **Step 1: GET 응답 실패 테스트 작성**

기존 GET 테스트의 기대 응답에 `challengeRange: 4`를 추가한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: 응답에 `challengeRange`가 없어 FAIL.

- [ ] **Step 3: 최소 API 구현**

GET 성공 응답에 아래 값을 추가한다.

```ts
return Response.json({
  ok: true,
  players,
  challengeRange: validationContext.config.challengeRange,
});
```

- [ ] **Step 4: API 테스트 통과 확인**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: PASS.

### Task 2: 양방향 상대 후보 필터링

**Files:**
- Modify: `app/[club]/MatchEntryDialog.test.tsx`
- Modify: `app/[club]/MatchEntryDialog.tsx`

**Interfaces:**
- Consumes: GET 응답의 `players`, `challengeRange`
- Produces: `opponentOptions(players, selectedId, challengeRange)` 기반 양방향 선택 목록

- [ ] **Step 1: 선수 1 기준 필터 실패 테스트 작성**

10명의 순위 데이터를 반환하고 5위 선택 후 선수 2에 1~4위와 6~9위만 있는지 검증한다.

- [ ] **Step 2: 선수 2 기준 필터 실패 테스트 작성**

선수 2를 먼저 선택했을 때 선수 1 목록도 같은 방식으로 줄어드는지 검증한다.

- [ ] **Step 3: API 범위 사용 실패 테스트 작성**

`challengeRange: 2` 응답에서 위·아래 두 명만 표시되는지 검증한다.

- [ ] **Step 4: 컴포넌트 테스트 실패 확인**

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx'`

Expected: 전체 선수가 계속 표시되어 FAIL.

- [ ] **Step 5: 최소 필터 구현**

```ts
function opponentOptions(
  players: MatchOption[],
  selectedId: string,
  challengeRange: number
) {
  if (!selectedId) return players;

  const selectedIndex = players.findIndex((player) => player.id === selectedId);
  if (selectedIndex === -1) return players;

  return players.filter((player, index) => {
    const distance = Math.abs(index - selectedIndex);
    return distance >= 1 && distance <= challengeRange;
  });
}
```

두 선택창이 각각 반대쪽 선택값을 기준으로 이 함수를 사용하고, 범위를 벗어난 기존 선택은 초기화한다.

- [ ] **Step 6: 집중 테스트 통과 확인**

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx' 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: PASS.

- [ ] **Step 7: 전체 검증**

Run: `npm test`

Expected: 모든 테스트 PASS.

Run: `npm run lint`

Expected: 오류 없음.

Run: `npm run build`

Expected: 프로덕션 빌드 성공.

- [ ] **Step 8: 모바일 브라우저 검증**

390px 너비에서 5위 선수를 선택하고 반대쪽 옵션이 1~4위와 6~9위로 제한되는지 확인한다. 콘솔 오류와 가로 넘침이 없어야 한다.
