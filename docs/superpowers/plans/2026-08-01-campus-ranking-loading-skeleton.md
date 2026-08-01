# Campus Ranking Loading Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠퍼스 랭킹의 초기 로딩 화면을 문구와 3줄 랭킹 스켈레톤으로 개선한다.

**Architecture:** 기존 `isInitialLoading` 분기 안에서만 로딩 마크업을 확장한다. 서버 데이터와 정상 화면은 그대로 두고, CSS로 박스 없는 행 구조와 축소 모션 대응을 제공한다.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest, Testing Library

## Global Constraints

- 대학 로고와 제목은 로딩 중에도 표시한다.
- 실제 데이터가 준비되기 전에는 0값, 입력 버튼, 빈 랭킹을 숨긴다.
- 스켈레톤은 3줄이며 카드나 외곽 박스를 사용하지 않는다.
- 보조 기술에는 실제 로딩 문구만 전달한다.

---

### Task 1: Loading Skeleton Contract

**Files:**
- Modify: `app/[club]/ClubRankingClient.test.tsx`
- Modify: `app/[club]/ClubRankingClient.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `isInitialLoading: boolean`
- Produces: `.campus-ranking-loading-list` 안의 `.campus-ranking-loading-row` 3개

- [ ] **Step 1: Write the failing test**

초기 로딩 테스트가 다음 내용을 확인하도록 변경한다.

```tsx
const { container } = render(<ClubRankingClient club={club} />);

expect(screen.getByText("실시간 순위를 불러오고 있어요")).toBeDefined();
expect(screen.getByText("잠시만 기다려주세요")).toBeDefined();
expect(
  container.querySelectorAll(".campus-ranking-loading-row")
).toHaveLength(3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- 'app/[club]/ClubRankingClient.test.tsx'`

Expected: 새 로딩 문구 또는 스켈레톤 행을 찾지 못해 실패한다.

- [ ] **Step 3: Write minimal implementation**

`ClubRankingClient`의 초기 로딩 분기를 다음 구조로 확장한다.

```tsx
<section className="campus-ranking-loading-state" role="status" aria-live="polite">
  <div className="campus-ranking-loading-copy">
    <span className="campus-ranking-loading-indicator" aria-hidden="true" />
    <div>
      <strong>실시간 순위를 불러오고 있어요</strong>
      <p>잠시만 기다려주세요</p>
    </div>
  </div>
  <div className="campus-ranking-loading-list" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <div className="campus-ranking-loading-row" key={row}>
        <span className="campus-ranking-skeleton-rank" />
        <span className="campus-ranking-skeleton-player">
          <span />
          <span />
        </span>
        <span className="campus-ranking-skeleton-record">
          <span />
          <span />
        </span>
      </div>
    ))}
  </div>
</section>
```

CSS는 가운데 정렬된 안내 문구, 가로 구분선 3줄, 은은한 스켈레톤 밝기 변화와 `prefers-reduced-motion` 처리를 제공한다.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npm test -- 'app/[club]/ClubRankingClient.test.tsx'
npm test
npm run lint
npm run build
```

Expected: 모든 명령이 성공한다.

- [ ] **Step 5: Verify in browser**

서울과기대와 PETC 페이지를 느린 네트워크 상태로 열어 모바일·데스크톱에서 로딩 화면의 간격, 줄 정렬, 오버플로를 확인한다.

- [ ] **Step 6: Commit and push**

```bash
git add app/[club]/ClubRankingClient.test.tsx app/[club]/ClubRankingClient.tsx app/globals.css docs/superpowers
git commit -m "fix: enrich campus ranking loading state"
git push
```
