# Player Detail Open Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선수 상세 페이지를 카드 없이 여백과 가로 구분선으로 이어지는 열린 기록 화면으로 재구성한다.

**Architecture:** `PlayerDetailView`의 데이터와 마크업 의미는 유지하고, 공통 스타일 계층을 열린 레이아웃으로 변경한다. 별도 상태나 데이터 변환은 추가하지 않는다.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Vitest, Testing Library, CSS

## Global Constraints

- 선수 상세 데이터, 통계 계산, 링크, Amplitude 이벤트는 변경하지 않는다.
- 큰 외곽 카드와 내부 기록 카드를 모두 제거한다.
- 모바일 통계는 안정적인 2열 그리드를 유지한다.
- production CSS를 변경하기 전에 실패하는 테스트를 먼저 확인한다.

---

### Task 1: Lock The Open Layout With Tests

**Files:**
- Modify: `app/globals.test.ts`
- Verify: `app/[club]/players/[player]/page.test.tsx`

- [ ] **Step 1: Replace old card-style expectations**

선수 상세 패널, 통계 행, 세부 섹션, 기록 행, 점수에 배경·외곽선·둥근 모서리·그림자가 없어야 한다고 명시한다.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
npm test -- app/globals.test.ts 'app/[club]/players/[player]/page.test.tsx'
```

Expected: 기존 CSS가 카드 스타일이라 실패한다.

### Task 2: Implement The Open Detail Layout

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Remove outer and nested cards**

큰 상세 패널, 통계 컨테이너, 세부 섹션, 시즌·상대·최근 경기 행을 투명한 배경과 가로 구분선 구조로 바꾼다.

- [ ] **Step 2: Refine typography and spacing**

선수 이름과 통계를 명확히 계층화하고, 순위와 점수의 장식 배경을 제거한다.

- [ ] **Step 3: Keep mobile layout compact**

모바일에서 통계는 2열, 기록은 충돌 없는 그리드로 표시하고 페이지 좌우 여백을 안정적으로 유지한다.

- [ ] **Step 4: Run targeted tests and verify GREEN**

```bash
npm test -- app/globals.test.ts 'app/[club]/players/[player]/page.test.tsx'
```

Expected: PASS.

### Task 3: Visual And Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Inspect desktop and mobile**

서울과기대 선수 상세를 데스크톱과 390px 모바일에서 캡처해 카드 제거, 구분선, 간격, 텍스트 오버플로를 확인한다.

- [ ] **Step 2: Run full automated checks**

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit and push**

```bash
git add app/globals.css app/globals.test.ts docs/superpowers
git commit -m "style: open player detail layout"
git push
```
