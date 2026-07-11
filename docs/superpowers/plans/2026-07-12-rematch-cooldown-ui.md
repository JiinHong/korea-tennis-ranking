# 경기 입력 재대결 제한 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 경기 입력에서 동일 상대와의 재대결 제한을 제출 전에 확인하고, 제한 상대와 다시 가능한 날짜를 선택 목록에 안내한다.

**Architecture:** 현재 시즌 경기만 검증 컨텍스트에 포함하고 공용 규칙 모듈이 재대결 가능일을 계산한다. 경기 옵션 API는 오늘도 제한 중인 활성 선수 조합만 정제해 반환하며, 클라이언트는 기존 도전 범위 후보 안에서 해당 조합을 비활성화한다. Supabase 트랜잭션 검증은 최종 권한으로 유지한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Supabase Postgres, Vitest, Testing Library

## Global Constraints

- 동일 선수와의 재대결은 직전 경기일로부터 14일 동안 제한하며 14일째가 지난 날짜부터 허용한다.
- 실제 제한 일수와 도전 범위는 하드코딩하지 않고 현재 시즌 `rule_configs` 값을 사용한다.
- 현재 시즌의 확정 경기만 재대결 제한에 포함한다.
- 부상자를 제외한 활성 선수 순서 기준 도전 범위 필터를 유지한다.
- 제한 상대는 숨기지 않고 비활성화하며 `M월 D일부터 가능`을 표시한다.
- POST의 Supabase 트랜잭션 검증을 우회하거나 대체하지 않는다.
- DB 스키마, RLS, 로그인 기능은 변경하지 않는다.

---

### Task 1: 현재 시즌과 재대결 날짜 경계 통일

**Files:**
- Modify: `lib/rankingRules.ts`
- Modify: `lib/rankingRules.test.ts`
- Modify: `lib/supabaseRankingRepository.ts`
- Modify: `lib/supabaseRankingRepository.test.ts`

**Interfaces:**
- Consumes: `PreviousMatch.playedOn`, `RankingRuleConfig.rematchCooldownDays`, 현재 시즌 ID
- Produces: `getRematchAvailableOn(playedOn: string, cooldownDays: number): string`, 현재 시즌만 담긴 `previousMatches`

- [ ] **Step 1: 재대결 가능일과 종료일 경계의 실패 테스트 작성**

```ts
expect(getRematchAvailableOn("2026-07-01", 14)).toBe("2026-07-15");

expect(
  validateRematchCooldown(
    {
      player1Id: "p1",
      player2Id: "p2",
      player1Score: 6,
      player2Score: 4,
      playedOn: "2026-07-15",
    },
    [{ playerAId: "p1", playerBId: "p2", playedOn: "2026-07-01" }],
    {
      challengeRange: 4,
      rematchCooldownDays: 14,
      inactivityPenaltyDrop: 2,
    }
  )
).toEqual({ ok: true });
```

- [ ] **Step 2: 규칙 테스트를 실행해 export 부재로 실패하는지 확인**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: `getRematchAvailableOn`이 없어 FAIL.

- [ ] **Step 3: 날짜 전용 UTC 계산과 기존 검증 재사용 구현**

```ts
export function getRematchAvailableOn(
  playedOn: string,
  cooldownDays: number
): string {
  const [year, month, day] = playedOn.split("-").map(Number);
  const available = new Date(Date.UTC(year, month - 1, day + cooldownDays));

  return [
    available.getUTCFullYear(),
    String(available.getUTCMonth() + 1).padStart(2, "0"),
    String(available.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
```

`validateRematchCooldown`은 같은 조합의 경기일이 입력일보다 미래가 아니고, 입력일이 `getRematchAvailableOn`보다 이른 경우만 차단한다.

- [ ] **Step 4: 현재 시즌 경기만 남기는 실패 테스트 작성**

`getSupabaseMatchValidationContext` 기대값에서 `season-2` 경기를 제거하고 `season-3` 경기만 남긴다.

- [ ] **Step 5: 저장소 테스트를 실행해 과거 시즌이 남아 실패하는지 확인**

Run: `npm test -- lib/supabaseRankingRepository.test.ts`

Expected: `previousMatches`에 과거 시즌 행이 추가되어 FAIL.

- [ ] **Step 6: 검증 컨텍스트에서 현재 시즌 경기만 매핑**

```ts
previousMatches: confirmedMatches
  .filter((match) => match.seasonId === currentSeason.id)
  .map((match) => ({
    playerAId: match.challenger.id,
    playerBId: match.defender.id,
    playedOn: match.playedOn,
  })),
```

- [ ] **Step 7: 두 테스트 파일을 실행하고 통과 확인**

Run: `npm test -- lib/rankingRules.test.ts lib/supabaseRankingRepository.test.ts`

Expected: 두 파일 모두 PASS.

- [ ] **Step 8: 커밋**

```bash
git add lib/rankingRules.ts lib/rankingRules.test.ts lib/supabaseRankingRepository.ts lib/supabaseRankingRepository.test.ts
git commit -m "fix: align rematch cooldown boundaries"
```

### Task 2: 경기 옵션 API에 진행 중인 제한 조합 추가

**Files:**
- Modify: `app/api/clubs/[club]/matches/route.ts`
- Modify: `app/api/clubs/[club]/matches/route.test.ts`

**Interfaces:**
- Consumes: `validationContext.previousMatches`, `config.rematchCooldownDays`, `getRematchAvailableOn`
- Produces: `{ playerAId: string; playerBId: string; availableOn: string }[]` 형태의 `rematchCooldowns`

- [ ] **Step 1: 진행 중·종료·중복 조합의 실패 테스트 작성**

서울 날짜를 `2026-07-10`으로 고정하고 다음을 기대한다.

```ts
expect(await response.json()).toMatchObject({
  rematchCooldowns: [
    { playerAId: "p1", playerBId: "p2", availableOn: "2026-07-14" },
  ],
});
```

테스트 데이터에는 같은 조합의 더 오래된 경기, 정확히 오늘 제한이 끝난 조합, 활동 선수가 아닌 조합을 함께 넣어 제외 여부를 검증한다.

- [ ] **Step 2: API 테스트를 실행해 필드 부재로 실패 확인**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: `rematchCooldowns`가 없어 FAIL.

- [ ] **Step 3: 현재 진행 중인 활성 선수 조합만 정제해 반환**

```ts
type PublicRematchCooldown = {
  playerAId: string;
  playerBId: string;
  availableOn: string;
};
```

활성 선수 ID 집합으로 양쪽 선수를 확인하고, 미래 경기와 `availableOn <= today`인 기록을 제외한다. ID를 정렬한 조합 키로 중복을 합치며 가장 늦은 `availableOn`을 유지한 뒤 API 응답에 `rematchCooldowns`를 넣는다.

- [ ] **Step 4: API 테스트를 다시 실행해 통과 확인**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add 'app/api/clubs/[club]/matches/route.ts' 'app/api/clubs/[club]/matches/route.test.ts'
git commit -m "feat: expose active rematch cooldowns"
```

### Task 3: 선수 선택 목록에 제한 상태와 가능일 표시

**Files:**
- Modify: `app/[club]/MatchEntryDialog.tsx`
- Modify: `app/[club]/MatchEntryDialog.test.tsx`

**Interfaces:**
- Consumes: GET 응답의 `rematchCooldowns`
- Produces: 양방향으로 제한 상대를 비활성화한 `<option>`과 한국어 가능일 라벨

- [ ] **Step 1: 첫 번째 선수를 기준으로 제한 상대가 비활성화되는 실패 테스트 작성**

```ts
const blocked = optionByValue("선수 2", "p4");
expect(blocked.disabled).toBe(true);
expect(blocked.textContent).toContain("7월 24일부터 가능");
```

- [ ] **Step 2: 두 번째 선수를 먼저 선택한 경우의 대칭 실패 테스트 작성**

`선수 2`를 먼저 고른 뒤 `선수 1`의 같은 상대 옵션이 비활성화되고 같은 날짜를 표시하는지 검증한다.

- [ ] **Step 3: UI 테스트를 실행해 옵션이 활성 상태라 실패하는지 확인**

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx'`

Expected: 제한 옵션의 `disabled`가 `false`여서 FAIL.

- [ ] **Step 4: 응답 타입, 상태, 조합 조회와 날짜 표시 구현**

```ts
type RematchCooldown = {
  playerAId: string;
  playerBId: string;
  availableOn: string;
};

function formatAvailableOn(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  return `${month}월 ${day}일부터 가능`;
}
```

선수 옵션을 렌더링할 때 선택된 반대 선수와 현재 후보의 조합을 찾아 제한이 있으면 `disabled`를 설정하고 기존 `순위 · 이름` 뒤에 가능일을 붙인다. 다이얼로그를 열 때 제한 상태도 초기화하고 GET 성공 시 저장한다.

- [ ] **Step 5: UI 테스트를 다시 실행해 통과 확인**

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx'`

Expected: PASS.

- [ ] **Step 6: 관련 테스트를 함께 실행해 범위 필터와 제출 회귀 확인**

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx' 'app/api/clubs/[club]/matches/route.test.ts' lib/rankingRules.test.ts lib/supabaseRankingRepository.test.ts`

Expected: 네 파일 모두 PASS.

- [ ] **Step 7: 커밋**

```bash
git add 'app/[club]/MatchEntryDialog.tsx' 'app/[club]/MatchEntryDialog.test.tsx'
git commit -m "feat: guide rematch cooldown in match entry"
```

### Task 4: 통합 검증과 배포

**Files:**
- Verify: 전체 저장소

**Interfaces:**
- Consumes: Tasks 1-3 결과
- Produces: 테스트·린트·빌드·브라우저 QA·운영 API 검증 증거

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`

Expected: 모든 테스트 PASS.

- [ ] **Step 2: 린트와 프로덕션 빌드 실행**

Run: `npm run lint`

Expected: 오류 없이 종료.

Run: `npm run build`

Expected: Next.js 프로덕션 빌드 성공.

- [ ] **Step 3: 모바일 브라우저 검증**

`/seoultech`에서 경기 입력을 열고 범위 필터, 제한 옵션 비활성화, 가능일 문구, 역방향 선택, 가로 넘침, 콘솔 오류를 확인한다.

- [ ] **Step 4: 코드 리뷰 후 main에 병합하고 push**

기능 브랜치 전체 diff를 리뷰하고 Critical/Important 문제를 해결한 뒤 `main`으로 fast-forward 병합해 origin에 push한다.

- [ ] **Step 5: Vercel 운영 배포와 API 확인**

새 Production 배포가 `Ready`인지 확인하고 `https://koreatennisranking.com/api/clubs/seoultech/matches`가 `rematchCooldowns`를 반환하는지 검증한다.
