# Campus Ranking Engagement Implementation Plan

**Goal:** 최근 대회 결과 안내와 월요일 기준 주간 순위 변동을 캠퍼스 단식 랭킹에 추가한다.

**Architecture:** Supabase가 주간 순위 스냅샷을 보관하고, 서버 저장소가 현재 순위와 기준 순위의 차이를 계산해 기존 랭킹 API에 포함한다. 클라이언트는 계산된 값과 대회 결과 안내만 표현한다.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Supabase Postgres, pg_cron, Vitest, Testing Library, CSS

## Constraints

- 매주 월요일 00:00 KST를 고정 기준으로 사용한다.
- 페이지 조회 시 스냅샷을 생성하거나 변경하지 않는다.
- 서울과기대와 PETC 공통 컴포넌트에 적용한다.
- 하위 순위 선수의 도전 규칙은 변경하지 않는다.
- production 코드를 작성하기 전에 실패하는 테스트를 먼저 확인한다.

### Task 1: Weekly Snapshot Contract

- [ ] KST 주 시작일 계산 실패 테스트를 작성한다.
- [ ] Supabase 저장소의 스냅샷 조회와 순위 차이 실패 테스트를 작성한다.
- [ ] 최소 구현으로 테스트를 통과시킨다.

### Task 2: Snapshot Storage And Automation

- [ ] 주간 스냅샷 테이블, 읽기 정책, 캡처 함수를 migration으로 작성한다.
- [ ] 월요일 00:00 KST cron과 현재 주 초기 스냅샷을 추가한다.
- [ ] 연결된 Supabase에 migration을 적용하고 결과를 확인한다.

### Task 3: Result Notice And Movement UI

- [ ] 정확한 안내 문구, 링크, 섹션 순서, 변동 표시 실패 테스트를 작성한다.
- [ ] API의 `rankChange`를 순위 행에 접근성 있게 표시한다.
- [ ] 최근 대회 결과 안내를 최근 30일 기록과 전체 랭킹 사이에 배치한다.
- [ ] 모바일과 데스크톱 CSS를 구현한다.

### Task 4: Verification And Delivery

- [ ] 관련 테스트와 전체 테스트를 실행한다.
- [ ] lint와 production build를 실행한다.
- [ ] 서울과기대와 PETC를 모바일·데스크톱에서 캡처 검수한다.
- [ ] 변경사항을 커밋하고 push한다.
