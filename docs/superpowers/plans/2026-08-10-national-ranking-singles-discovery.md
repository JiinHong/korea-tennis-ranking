# National Ranking Singles Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전국 대학 랭킹 페이지에서 대회 성적 펼치기 동작을 명확히 보이고, 서울과기대 느티나무와 고려대 PETC의 단식 랭킹으로 바로 이동할 수 있게 한다.

**Architecture:** 전국 랭킹 전용 링크 매핑을 작은 순수 모듈로 분리하고, 랭킹 표가 운영 여부를 판단해 배지와 링크 정보를 상세 컴포넌트에 전달한다. 기존 행 전체 disclosure, 현재 부문 상태, 최고 성적 애니메이션과 분석 이벤트는 유지하며 학교별 성적 페이지와 실제 단식 랭킹 페이지는 수정하지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, CSS

## Global Constraints

- 변경 범위는 전국 대학 랭킹 페이지(`/`)와 그 전용 컴포넌트·테스트·스타일로 제한한다.
- 대학 검색, 상단 단식 랭킹 배너, 별도 사용 안내 문구를 추가하지 않는다.
- 운영 배지 문구는 정확히 `단식 랭킹 운영 중`을 사용한다.
- 데스크톱 배지는 동아리명 오른쪽, 모바일 배지는 학교명 오른쪽에 둔다.
- 펼친 영역의 링크 문구는 정확히 `전체 성적 보기`와 `단식 랭킹 보기`를 사용한다.
- 두 링크는 박스와 밑줄 없이 표시하며 `단식 랭킹 보기`를 오른쪽 하단에 둔다.
- 기능 변경은 실패하는 테스트를 먼저 작성하는 TDD 순서로 진행한다.
- 390px 모바일과 데스크톱에서 라이트·다크 모드를 직접 검수한다.

---

## File Structure

- Create: `app/_components/national-ranking/campusRankingLinks.ts` — 전국 랭킹 슬러그를 단식 랭킹 경로와 캠퍼스 슬러그로 안전하게 매핑한다.
- Modify: `app/page.tsx` — 양구 대회 맥락의 헤더 문구를 적용한다.
- Modify: `app/page.test.tsx` — 헤더 문구 회귀를 검증한다.
- Modify: `app/_components/national-ranking/NationalRankingTable.tsx` — 액션 열, 반응형 운영 배지, 링크 정보를 추가한다.
- Modify: `app/_components/national-ranking/NationalRankingTable.test.tsx` — 운영·미운영 행, 열 구조, 액션 상태를 검증한다.
- Modify: `app/_components/national-ranking/NationalRankingExpandedResults.tsx` — 좌우 텍스트 링크와 단식 랭킹 분석 이벤트를 추가한다.
- Modify: `app/_components/national-ranking/NationalRankingExpandedResults.test.tsx` — URL, 조건부 렌더링, 분석 이벤트를 검증한다.
- Modify: `app/globals.css` — 데스크톱·모바일 배치, 라이트·다크 대비와 링크 정렬을 구현한다.

---

### Task 1: 전국 랭킹 헤더 문구

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Home(): Promise<ReactElement>`과 기존 `getCachedNationalRankingPageData()` 결과
- Produces: 양구 대회 맥락을 전달하는 정적 헤더 문구

- [ ] **Step 1: 기존 문구 대신 새 소개 문구를 요구하는 실패 테스트 작성**

`app/page.test.tsx`의 게시된 랭킹 테스트에서 다음 기대값을 사용한다.

```tsx
expect(
  screen.getByText(
    "양구 대회 전에 각 학교의 최근 성적을 비교해 보면 재미있을 것 같아 정리해봤습니다."
  )
).toBeDefined();
expect(screen.getByText("최근 3년간 6개 대회 성적 반영")).toBeDefined();
expect(
  screen.queryByText(
    "최근 3년간 6개 대학 테니스 대회 성적을 반영한 랭킹입니다."
  )
).toBeNull();
expect(
  screen.queryByText("동아리를 누르면 주요 대회 성적을 볼 수 있어요.")
).toBeNull();
```

- [ ] **Step 2: 헤더 테스트가 현재 문구 때문에 실패하는지 확인**

Run: `npm test -- app/page.test.tsx`

Expected: 새 양구 문구와 `최근 3년간 6개 대회 성적 반영`을 찾지 못해 FAIL

- [ ] **Step 3: `app/page.tsx`의 설명 문구를 최소 변경**

```tsx
<p className="national-header-description">
  <span>
    양구 대회 전에 각 학교의 최근 성적을 비교해 보면 재미있을 것 같아
    정리해봤습니다.
  </span>
  <span className="national-header-tournaments">
    최근 3년간 6개 대회 성적 반영
  </span>
  <span className="national-header-tournaments">
    양구 · 경인지구 · 춘천 · 인제 · 영월 · WEMIX OPEN
  </span>
</p>
```

- [ ] **Step 4: 헤더 테스트 통과 확인**

Run: `npm test -- app/page.test.tsx`

Expected: PASS

- [ ] **Step 5: 헤더 변경 커밋**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat: frame national ranking for Yanggu"
```

---

### Task 2: 단식 랭킹 링크 매핑과 상세 액션

**Files:**
- Create: `app/_components/national-ranking/campusRankingLinks.ts`
- Modify: `app/_components/national-ranking/NationalRankingExpandedResults.test.tsx`
- Modify: `app/_components/national-ranking/NationalRankingExpandedResults.tsx`

**Interfaces:**
- Produces: `getCampusRankingLink(clubSlug: string): CampusRankingLink | null`
- Produces: `CampusRankingLink = { campusClubSlug: "seoultech" | "petc"; href: "/seoultech" | "/petc" }`
- Consumes: `campusRankingLink: CampusRankingLink | null` prop

- [ ] **Step 1: 운영·미운영 동아리 링크와 분석 이벤트의 실패 테스트 작성**

`NationalRankingExpandedResults.test.tsx`에 다음 검증을 추가한다.

```tsx
it("운영 동아리의 단식 랭킹 링크에 현재 부문을 전달하고 클릭을 기록한다", () => {
  render(
    <NationalRankingExpandedResults
      activeGender="women"
      bestResults={bestResults}
      campusRankingLink={{ campusClubSlug: "seoultech", href: "/seoultech" }}
      clubSlug="seoultech-neutinamu"
      displayName="서울과학기술대학교 느티나무"
      latestEditionYears={latestEditionYears}
      regionId="seoultech-results"
    />
  );

  const campusLink = screen.getByRole("link", { name: "단식 랭킹 보기" });
  expect(campusLink.getAttribute("href")).toBe("/seoultech?fromGender=women");
  campusLink.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(campusLink);

  expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
    "Campus Ranking Link Clicked",
    {
      source: "national_ranking_preview",
      club_slug: "seoultech-neutinamu",
      campus_club_slug: "seoultech",
      division: "women",
    }
  );
});

it("미운영 동아리는 전체 성적 링크만 보여준다", () => {
  render(
    <NationalRankingExpandedResults
      activeGender="men"
      bestResults={bestResults}
      campusRankingLink={null}
      clubSlug="kaist"
      displayName="한국과학기술원 KAIST Tennis"
      latestEditionYears={latestEditionYears}
      regionId="kaist-results"
    />
  );

  expect(screen.getByRole("link", { name: "전체 성적 보기" })).toBeDefined();
  expect(screen.queryByRole("link", { name: "단식 랭킹 보기" })).toBeNull();
});
```

기존 렌더 호출에는 `campusRankingLink={null}`을 추가한다.

- [ ] **Step 2: 새 prop이 없어 타입·동작 테스트가 실패하는지 확인**

Run: `npm test -- app/_components/national-ranking/NationalRankingExpandedResults.test.tsx`

Expected: `campusRankingLink` prop 또는 `단식 랭킹 보기` 링크가 없어 FAIL

- [ ] **Step 3: 안전한 링크 매핑 모듈 작성**

```ts
export type CampusRankingLink = {
  campusClubSlug: "seoultech" | "petc";
  href: "/seoultech" | "/petc";
};

const campusRankingLinks = new Map<string, CampusRankingLink>([
  ["seoultech-neutinamu", { campusClubSlug: "seoultech", href: "/seoultech" }],
  ["korea-petc", { campusClubSlug: "petc", href: "/petc" }],
]);

export function getCampusRankingLink(
  clubSlug: string
): CampusRankingLink | null {
  return campusRankingLinks.get(clubSlug) ?? null;
}
```

- [ ] **Step 4: 상세 영역에 좌우 텍스트 링크와 분석 이벤트 구현**

`NationalRankingExpandedResults`에 `campusRankingLink` prop을 추가하고 기존 전체 성적 링크를 다음 컨테이너로 감싼다.

```tsx
<div className="national-ranking-results-actions">
  <Link
    className="national-ranking-results-link is-results"
    href={`/clubs/${clubSlug}?gender=${activeGender}`}
    onClick={() => {
      void trackAmplitudeEvent("National Club Results Opened", {
        club_slug: clubSlug,
        division: activeGender,
      });
    }}
  >
    전체 성적 보기
  </Link>
  {campusRankingLink ? (
    <Link
      className="national-ranking-results-link is-campus"
      href={`${campusRankingLink.href}?fromGender=${activeGender}`}
      onClick={() => {
        void trackAmplitudeEvent("Campus Ranking Link Clicked", {
          source: "national_ranking_preview",
          club_slug: clubSlug,
          campus_club_slug: campusRankingLink.campusClubSlug,
          division: activeGender,
        });
      }}
    >
      단식 랭킹 보기
    </Link>
  ) : null}
</div>
```

- [ ] **Step 5: 상세 액션 테스트 통과 확인**

Run: `npm test -- app/_components/national-ranking/NationalRankingExpandedResults.test.tsx`

Expected: PASS

- [ ] **Step 6: 링크 매핑과 상세 액션 커밋**

```bash
git add app/_components/national-ranking/campusRankingLinks.ts app/_components/national-ranking/NationalRankingExpandedResults.tsx app/_components/national-ranking/NationalRankingExpandedResults.test.tsx
git commit -m "feat: link ranking previews to singles rankings"
```

---

### Task 3: 랭킹 행 운영 배지와 성적 액션

**Files:**
- Modify: `app/_components/national-ranking/NationalRankingTable.test.tsx`
- Modify: `app/_components/national-ranking/NationalRankingTable.tsx`

**Interfaces:**
- Consumes: `getCampusRankingLink(clubSlug)` from Task 2
- Produces: 네 열 구조와 반응형 배지 DOM
- Passes: `campusRankingLink` to `NationalRankingExpandedResults`

- [ ] **Step 1: 운영 배지·시각적 액션·열 수의 실패 테스트 작성**

`NationalRankingTable.test.tsx`에 다음 검증을 추가한다.

```tsx
it("운영 동아리에만 반응형 단식 랭킹 배지와 링크를 표시한다", () => {
  render(<NationalRankingTable rankings={rankings} />);

  expect(screen.getAllByText("단식 랭킹 운영 중")).toHaveLength(4);
  expect(
    screen.getByRole("button", {
      name: "한국과학기술원 KAIST Tennis 최고 성적 펼치기",
    }).closest("tr")?.textContent
  ).not.toContain("단식 랭킹 운영 중");

  fireEvent.click(
    screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    })
  );
  expect(screen.getByRole("link", { name: "단식 랭킹 보기" }).getAttribute("href"))
    .toBe("/seoultech?fromGender=men");
});

it("성적 열과 빈 상태·상세 행을 네 열 구조로 유지한다", () => {
  const { container } = render(<NationalRankingTable rankings={rankings} />);

  expect(screen.getByRole("columnheader", { name: "성적" })).toBeDefined();
  expect(screen.getAllByText("성적 보기").length).toBeGreaterThan(0);

  fireEvent.click(
    screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    })
  );
  expect(screen.getByText("성적 접기")).toBeDefined();
  expect(
    container.querySelector(".national-ranking-detail-row > td")?.getAttribute("colspan")
  ).toBe("4");
});
```

- [ ] **Step 2: 운영 배지와 네 번째 열이 없어 실패하는지 확인**

Run: `npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx`

Expected: 배지, `성적` 열, `단식 랭킹 보기` 링크가 없어 FAIL

- [ ] **Step 3: 표 행에 링크 정보, 반응형 배지와 액션 열 구현**

각 행에서 다음 값을 만든다.

```tsx
const campusRankingLink = getCampusRankingLink(row.clubSlug);
```

학교명 영역에는 모바일 배지, 동아리명·왕관 묶음에는 데스크톱 배지를 렌더한다.

```tsx
<span className="national-ranking-club">
  <strong>{row.universityName}</strong>
  {campusRankingLink ? (
    <span className="national-ranking-operating-badge is-mobile">
      단식 랭킹 운영 중
    </span>
  ) : null}
</span>
<span className="national-ranking-club-meta">
  <span className="national-ranking-club-name">{row.clubName}</span>
  {campusRankingLink ? (
    <span className="national-ranking-operating-badge is-desktop">
      단식 랭킹 운영 중
    </span>
  ) : null}
  {displayedHonors.length > 0 ? (
    <span aria-label="최근 1년 수상 기록" className="national-ranking-honors">
      {displayedHonors.map((honor) => (
        <NationalRankingHonor
          honor={honor}
          key={`${honor.editionKey}-${honor.stage}`}
        />
      ))}
    </span>
  ) : null}
</span>
```

표에 네 번째 열과 상태 텍스트를 추가하고 빈 상태 및 상세 행 `colSpan`을 4로 바꾼다.

```tsx
<col className="national-ranking-action-column" />
// ...
<th scope="col">성적</th>
// ...
<td aria-hidden="true" className="national-ranking-row-action">
  <span>{isExpanded ? "성적 접기" : "성적 보기"}</span>
  <span className="national-ranking-row-chevron">〉</span>
</td>
```

`NationalRankingExpandedResults` 호출에는 `campusRankingLink={campusRankingLink}`를 전달한다.

- [ ] **Step 4: 표 테스트 통과 확인**

Run: `npm test -- app/_components/national-ranking/NationalRankingTable.test.tsx`

Expected: PASS

- [ ] **Step 5: 랭킹 행 구조 커밋**

```bash
git add app/_components/national-ranking/NationalRankingTable.tsx app/_components/national-ranking/NationalRankingTable.test.tsx
git commit -m "feat: reveal ranking row actions and singles status"
```

---

### Task 4: 반응형 스타일과 전체 검증

**Files:**
- Modify: `app/globals.css`
- Modify only if verification exposes an issue: files already listed in Tasks 1–3

**Interfaces:**
- Consumes: `.national-ranking-operating-badge`, `.national-ranking-row-action`, `.national-ranking-results-actions`, `.national-ranking-results-link`
- Produces: 390px 모바일과 데스크톱의 라이트·다크 최종 레이아웃

- [ ] **Step 1: 데스크톱 스타일 구현**

```css
.national-ranking-action-column {
  width: 112px;
}

.national-ranking-club-meta,
.national-ranking-results-actions {
  display: flex;
  align-items: center;
}

.national-ranking-club-meta {
  gap: 8px;
  min-width: 0;
}

.national-ranking-operating-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  color: var(--national-accent);
  border: 1px solid color-mix(in srgb, var(--national-accent) 48%, transparent);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  white-space: nowrap;
}

.national-ranking-operating-badge.is-mobile {
  display: none;
}

.national-ranking-row-action {
  color: var(--national-muted);
  text-align: right;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 800;
}

.national-ranking-row-chevron {
  display: inline-block;
  margin-left: 4px;
  color: var(--national-accent);
  transition: transform 180ms ease;
}

.national-ranking-main-row[data-expanded="true"]
  .national-ranking-row-chevron {
  transform: rotate(90deg);
}

.national-ranking-results-actions {
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  margin-top: 10px;
}

.national-ranking-results-link {
  min-height: 34px;
  margin-top: 0;
  padding: 0 1px;
  text-decoration: none;
}
```

- [ ] **Step 2: 모바일 배치 구현**

```css
@media (max-width: 640px) {
  .national-ranking-score-column {
    width: 72px;
  }

  .national-ranking-action-column {
    width: 34px;
  }

  .national-ranking-operating-badge.is-desktop {
    display: none;
  }

  .national-ranking-operating-badge.is-mobile {
    display: inline-flex;
  }

  .national-ranking-row-action span:first-child {
    display: none;
  }

  .national-ranking-row-chevron {
    margin-left: 0;
    font-size: 16px;
  }

  .national-ranking-results-link {
    min-height: 44px;
  }
}
```

- [ ] **Step 3: 관련 테스트와 정적 검증 실행**

Run:

```bash
npm test -- app/page.test.tsx app/_components/national-ranking/NationalRankingTable.test.tsx app/_components/national-ranking/NationalRankingExpandedResults.test.tsx
npm run lint
npm run build
```

Expected: 모든 명령 exit 0

- [ ] **Step 4: 전체 테스트 실행**

Run: `npm test`

Expected: 전체 테스트 PASS

- [ ] **Step 5: 브라우저에서 네 조합 직접 검수**

Run: `npm run dev`

검수 URL: `http://localhost:3000/?gender=men`

확인 조합:

- 1440px 데스크톱 라이트·다크
- 390px 모바일 라이트·다크
- 느티나무 행 닫힘·열림
- KAIST 행 열림 시 단식 랭킹 링크 미노출
- 데스크톱 배지는 동아리명 오른쪽, 모바일 배지는 학교명 오른쪽
- `전체 성적 보기` 왼쪽, `단식 랭킹 보기` 오른쪽
- 링크에 박스와 밑줄 없음
- 행 hover가 다크 모드에서 흰색으로 바뀌지 않음

- [ ] **Step 6: 최종 스타일·검증 커밋**

```bash
git add app/globals.css docs/superpowers/plans/2026-08-10-national-ranking-singles-discovery.md
git commit -m "style: polish national ranking discovery"
```

- [ ] **Step 7: 커밋과 원격 상태 확인 후 푸시**

```bash
git status --short
git log --oneline -6
git push origin main
```

Expected: 작업 트리가 깨끗하고 원격 `main` 푸시 성공
