# Dark Mode Campus Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠퍼스 랭킹의 다크모드 대비·hover·로딩을 교정하고, 시스템 초기값을 유지하는 라이트/다크 pill 토글을 footer 오른쪽 하단에 배치한다.

**Architecture:** `next-themes`의 `resolvedTheme`로 최초 시스템 테마를 해석하고, 한 개의 토글 버튼이 명시적 `light` 또는 `dark`를 저장하게 한다. 대학 로고는 공통 `CampusClubLogo` 컴포넌트로 통일해 PETC 단색 로고에만 다크 처리를 적용한다. 캠퍼스 hover와 skeleton은 CSS 변수로 라이트·다크 팔레트를 분리해 하드코딩된 밝은 면과 단색 로딩 회귀를 제거한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-themes, lucide-react, CSS, Vitest, Testing Library

## Global Constraints

- 첫 방문은 운영체제의 라이트·다크 설정을 따른다.
- 토글 UI에는 라이트와 다크 두 상태만 제공한다.
- 토글은 화면에 고정하지 않고 footer 최하단 행의 오른쪽에 배치한다.
- PETC 검정 단색 로고만 다크모드에서 밝게 변환한다.
- `prefers-reduced-motion: reduce`에서는 로딩 애니메이션을 제거한다.
- 기존 랭킹 데이터, Supabase 구성, 순위 계산, 경기 입력 로직은 변경하지 않는다.
- 모든 동작 변경은 실패 테스트를 먼저 확인하는 TDD 순서로 진행한다.
- 모바일·데스크톱과 라이트·다크를 직접 검수한다.

---

### Task 1: Two-State Footer Theme Toggle

**Files:**
- Modify: `app/_components/theme/ThemeMenu.test.tsx`
- Modify: `app/_components/theme/ThemeMenu.tsx`
- Modify: `app/_components/site/SiteFooter.test.tsx`
- Modify: `app/_components/site/SiteFooter.tsx`
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `useTheme(): { resolvedTheme?: string; setTheme(theme: string): void }`
- Produces: `.theme-toggle`, `.theme-toggle-thumb`, `.site-footer-bottom`

- [ ] **Step 1: Read the installed Next.js client-component guidance**

Read `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` and confirm that the interactive toggle remains a Client Component while `SiteFooter` stays a Server Component.

- [ ] **Step 2: Write failing component tests**

Replace the three-option assertions with a hoisted theme state and a single toggle contract:

```tsx
const themeState = vi.hoisted(() => ({
  resolvedTheme: "dark",
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

it("현재 시스템 해석값의 반대 테마를 저장한다", () => {
  render(<ThemeMenu />);
  fireEvent.click(screen.getByRole("button", { name: "라이트 테마로 전환" }));
  expect(themeState.setTheme).toHaveBeenCalledWith("light");
});

it("시스템 선택지 없이 한 개의 라이트·다크 토글만 제공한다", () => {
  render(<ThemeMenu />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "시스템 테마" })).toBeNull();
});
```

Update `SiteFooter.test.tsx` so `.site-footer-bottom` contains the copyright and the one theme button:

```tsx
const bottom = container.querySelector(".site-footer-bottom");
expect(bottom).not.toBeNull();
expect(bottom?.textContent).toContain("© 2026 Korea Campus Tennis Ranking");
expect(within(bottom as HTMLElement).getAllByRole("button")).toHaveLength(1);
```

Update the CSS regression test to require a non-fixed `64 × 34px` pill and footer row:

```ts
expect(css).toMatch(/\.site-footer-bottom\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;[^}]*\}/);
expect(css).toMatch(/\.theme-toggle\s*\{[^}]*width:\s*64px;[^}]*height:\s*34px;[^}]*border-radius:\s*999px;[^}]*\}/);
expect(css).not.toMatch(/\.theme-menu\s*\{[^}]*position:\s*fixed;/);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
npm test -- app/_components/theme/ThemeMenu.test.tsx app/_components/site/SiteFooter.test.tsx app/globals.test.ts
```

Expected: FAIL because the current UI has three buttons, `.theme-menu` is fixed, and `.site-footer-bottom`/`.theme-toggle` do not exist.

- [ ] **Step 4: Implement the minimal two-state toggle**

Use `resolvedTheme` and preserve the existing hydration guard:

```tsx
const { resolvedTheme, setTheme } = useTheme();
const isDark = mounted && resolvedTheme === "dark";
const nextTheme = isDark ? "light" : "dark";

return (
  <div className="theme-menu">
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${nextTheme === "light" ? "라이트" : "다크"} 테마로 전환`}
      aria-pressed={isDark}
      onClick={() => setTheme(nextTheme)}
    >
      <Sun className="theme-toggle-icon is-sun" aria-hidden="true" />
      <Moon className="theme-toggle-icon is-moon" aria-hidden="true" />
      <span className="theme-toggle-thumb" aria-hidden="true" />
    </button>
  </div>
);
```

Move `ThemeMenu` beside the copyright in a new footer bottom row:

```tsx
<div className="site-footer-bottom">
  <p className="site-footer-copyright">© 2026 Korea Campus Tennis Ranking</p>
  <ThemeMenu />
</div>
```

Style the footer row and pill so the light theme uses a pale track with a dark thumb on the right, while `.dark` uses a dark track with a pale thumb on the left. Keep focus-visible styling and remove all fixed positioning.

```css
.site-footer-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
}

.theme-menu {
  flex: 0 0 auto;
  margin-left: auto;
}

.theme-toggle {
  position: relative;
  width: 64px;
  height: 34px;
  padding: 0;
  color: #172029;
  background: #eef1ef;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
}

.theme-toggle-icon {
  position: absolute;
  top: 8px;
  width: 16px;
  height: 16px;
}

.theme-toggle-icon.is-sun { left: 9px; }
.theme-toggle-icon.is-moon { right: 9px; }

.theme-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 28px;
  height: 28px;
  background: #172029;
  border-radius: 999px;
  transform: translateX(30px);
}

.dark .theme-toggle {
  color: #f4f6f5;
  background: #172029;
}

.dark .theme-toggle-thumb {
  background: #f4f6f5;
  transform: translateX(0);
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the same focused test command. Expected: all three files pass.

- [ ] **Step 6: Commit the toggle task**

```bash
git add app/_components/theme/ThemeMenu.test.tsx app/_components/theme/ThemeMenu.tsx app/_components/site/SiteFooter.test.tsx app/_components/site/SiteFooter.tsx app/globals.test.ts app/globals.css
git commit -m "fix: anchor theme toggle in footer"
```

---

### Task 2: Shared Campus Logo Treatment

**Files:**
- Create: `app/[club]/_components/CampusClubLogo.test.tsx`
- Create: `app/[club]/_components/CampusClubLogo.tsx`
- Modify: `app/[club]/_components/ClubRankingClient.tsx`
- Modify: `app/[club]/_components/PlayerDetailView.tsx`
- Modify: `app/[club]/matches/page.tsx`
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `club: Pick<ClubConfig, "slug" | "logoPath" | "logoAlt">`
- Produces: `<CampusClubLogo club={club} />`, `.campus-club-logo.is-monochrome`

- [ ] **Step 1: Read the installed Next.js Image guidance**

Read `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` and keep the current required `src`, `alt`, `width`, `height`, and `priority` behavior.

- [ ] **Step 2: Write the failing shared-logo test**

Create `CampusClubLogo.test.tsx`:

```tsx
it("PETC 단색 로고에만 다크모드 처리 클래스를 부여한다", () => {
  const { rerender } = render(<CampusClubLogo club={petcClub} />);
  expect(screen.getByRole("img", { name: petcClub.logoAlt }).className).toContain("is-monochrome");

  rerender(<CampusClubLogo club={seoultechClub} />);
  expect(screen.getByRole("img", { name: seoultechClub.logoAlt }).className).not.toContain("is-monochrome");
});
```

Add a CSS assertion:

```ts
expect(css).toMatch(/\.dark \.campus-club-logo\.is-monochrome\s*\{[^}]*filter:\s*[^;]+;[^}]*\}/);
```

- [ ] **Step 3: Run the logo tests and verify RED**

Run:

```bash
npm test -- 'app/[club]/_components/CampusClubLogo.test.tsx' app/globals.test.ts
```

Expected: FAIL because `CampusClubLogo` and its dark filter do not exist.

- [ ] **Step 4: Implement and integrate the shared logo**

Create the component:

```tsx
import Image from "next/image";
import type { ClubConfig } from "@/lib/campusRanking/config";

export default function CampusClubLogo({ club }: { club: Pick<ClubConfig, "slug" | "logoPath" | "logoAlt"> }) {
  const className = club.slug === "petc"
    ? "campus-club-logo is-monochrome"
    : "campus-club-logo";

  return <Image className={className} src={club.logoPath} alt={club.logoAlt} width={48} height={48} priority />;
}
```

Replace the three repeated `<Image>` blocks in the main ranking, player detail, and match history headers with `<CampusClubLogo club={club} />`. Add a dark-only CSS filter that maps the black PETC mark to the approved light sage range without changing the SeoulTech logo.

```css
.dark .campus-club-logo.is-monochrome {
  filter: invert(87%) sepia(14%) saturate(350%) hue-rotate(96deg)
    brightness(91%) contrast(91%);
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- 'app/[club]/_components/CampusClubLogo.test.tsx' 'app/[club]/_components/ClubRankingClient.test.tsx' 'app/[club]/matches/page.test.tsx' 'app/[club]/players/[player]/page.test.tsx' app/globals.test.ts
```

Expected: all focused component and CSS tests pass.

- [ ] **Step 6: Commit the logo task**

```bash
git add 'app/[club]/_components/CampusClubLogo.test.tsx' 'app/[club]/_components/CampusClubLogo.tsx' 'app/[club]/_components/ClubRankingClient.tsx' 'app/[club]/_components/PlayerDetailView.tsx' 'app/[club]/matches/page.tsx' app/globals.test.ts app/globals.css
git commit -m "fix: reveal campus marks in dark mode"
```

---

### Task 3: Campus Dark Surfaces And Loading Motion

**Files:**
- Modify: `app/globals.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `.campus-kicker`, `.campus-podium-player`, `.campus-recent-record-row`, `.campus-ranking-page .ranking-row`, `.campus-result-update`, `.campus-ranking-loading-*`
- Produces: `--campus-label-ink`, `--campus-label-border`, `--campus-hover-bg`, `--campus-skeleton-edge`, `--campus-skeleton-highlight`

- [ ] **Step 1: Write failing CSS regression tests**

Add assertions that require semantic variables and prohibit the observed regressions:

```ts
expect(css).toMatch(/\.campus-ranking-page\s*\{[^}]*--campus-hover-bg:[^;]+;[^}]*--campus-skeleton-edge:[^;]+;[^}]*--campus-skeleton-highlight:[^;]+;[^}]*\}/);
expect(css).toMatch(/\.dark \.campus-ranking-page\s*\{[^}]*--campus-label-ink:\s*#b8d6c7;[^}]*--campus-hover-bg:\s*#18232b;[^}]*\}/);
expect(css).toMatch(/\.campus-kicker\s*\{[^}]*color:\s*var\(--campus-label-ink\);[^}]*border:[^;]*var\(--campus-label-border\);[^}]*\}/);
expect(css).toMatch(/\.campus-podium-player:hover[\s\S]*?background:\s*var\(--campus-hover-bg\);/);
expect(css).toMatch(/\.campus-recent-record-row:hover[\s\S]*?background:\s*var\(--campus-hover-bg\);/);
expect(css).toMatch(/\.campus-ranking-page \.ranking-row:hover[\s\S]*?background:\s*var\(--campus-hover-bg\);/);
expect(css).toMatch(/\.dark \.campus-result-update\s*\{[^}]*background:\s*transparent;[^}]*\}/);
expect(css).toMatch(/\.dark \.campus-ranking-loading-row\s*\{[^}]*background:\s*transparent;[^}]*\}/);
expect(css).toMatch(/\.campus-ranking-skeleton-rank,[\s\S]*?background:\s*linear-gradient\([\s\S]*?var\(--campus-skeleton-highlight\)[\s\S]*?\);[\s\S]*?animation:\s*campus-ranking-skeleton-shimmer/);
```

- [ ] **Step 2: Run the CSS test and verify RED**

Run: `npm test -- app/globals.test.ts`

Expected: FAIL because hover colors are hardcoded, the dark notice is gray, and the dark skeleton override replaces the gradient with a single color.

- [ ] **Step 3: Implement semantic dark-mode surfaces**

Add the light defaults to `.campus-ranking-page` and dark overrides to `.dark .campus-ranking-page`. Update the label, all three hover selectors, and skeleton gradient to consume the variables. Split `.campus-ranking-loading-row` out of the dark skeleton selector so rows remain transparent. Change `.dark .campus-result-update` to `background: transparent` and give the loading indicator a visible sage pulse while preserving the existing reduced-motion media query.

```css
.campus-ranking-page {
  --campus-label-ink: #4b5563;
  --campus-label-border: #d7dce2;
  --campus-hover-bg: #fafbfc;
  --campus-skeleton-edge: #e9eeeb;
  --campus-skeleton-highlight: #f7f9f8;
}

.campus-kicker {
  color: var(--campus-label-ink);
  border: 1px solid var(--campus-label-border);
}

.campus-ranking-skeleton-rank,
.campus-ranking-skeleton-player > span,
.campus-ranking-skeleton-record > span {
  background: linear-gradient(
    90deg,
    var(--campus-skeleton-edge) 20%,
    var(--campus-skeleton-highlight) 38%,
    var(--campus-skeleton-edge) 58%
  );
  background-size: 220% 100%;
  animation: campus-ranking-skeleton-shimmer 1.6s ease-in-out infinite;
}

@media (hover: hover) and (pointer: fine) {
  .campus-podium-player:hover,
  .campus-recent-record-row:hover,
  .campus-ranking-page .ranking-row:hover {
    background: var(--campus-hover-bg);
  }
}

.dark .campus-ranking-page {
  --campus-label-ink: #b8d6c7;
  --campus-label-border: rgba(184, 214, 199, 0.55);
  --campus-hover-bg: #18232b;
  --campus-skeleton-edge: #22313a;
  --campus-skeleton-highlight: #3b4b56;
}

.dark .campus-ranking-loading-row,
.dark .campus-result-update {
  background: transparent;
}

.dark .campus-ranking-loading-indicator {
  background: var(--campus-green);
  box-shadow: 0 0 0 4px rgba(167, 199, 183, 0.12);
}
```

- [ ] **Step 4: Audit every campus hover selector**

Run:

```bash
rg -n "campus.*:hover|ranking-row:hover|background: (#fafbfc|#fffafa|white)" app/globals.css
```

Expected: podium, recent record, and campus ranking hover backgrounds use `var(--campus-hover-bg)`; no campus hover rule can produce a white surface in dark mode.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- app/globals.test.ts 'app/[club]/_components/ClubRankingClient.test.tsx'
```

Expected: both files pass, including the existing three-row loading contract.

- [ ] **Step 6: Commit the campus surface task**

```bash
git add app/globals.test.ts app/globals.css
git commit -m "fix: restore campus dark mode feedback"
```

---

### Task 4: Full Verification And Delivery

**Files:**
- Modify only if verification exposes an in-scope regression; add a failing test before each correction.

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: verified desktop/mobile light/dark behavior and pushed `origin/main`

- [ ] **Step 1: Run all automated verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit successfully with no new warnings caused by this change.

- [ ] **Step 2: Start the application and verify desktop**

At a desktop viewport around `1440 × 1000`, verify `/`, `/petc`, `/petc/matches`, a PETC player detail, `/seoultech`, `/admin`, and `/internal/analytics` in light and dark modes. Confirm the footer toggle scrolls with the document, PETC mark is visible, hover never turns white, the update notice is unboxed, and no horizontal overflow appears.

- [ ] **Step 3: Verify the initial loading state**

Delay or intercept `/api/clubs/petc/ranking` and confirm that the three skeleton rows visibly shimmer in dark mode, without a large filled rectangle. Confirm the pulse indicator is visible and reduced-motion emulation disables motion while retaining the shapes.

- [ ] **Step 4: Verify mobile**

At a mobile viewport around `390 × 844`, verify the same public page families in light and dark modes. Confirm the footer toggle remains right-aligned inside the footer, controls do not overlap content, PETC mark and label are legible, and no horizontal scrolling appears.

- [ ] **Step 5: Review the final diff and repository state**

Run:

```bash
git diff origin/main...HEAD
git status --short --branch
git log --oneline -6
```

Expected: only the approved design, plan, implementation, and tests are present; the working tree is clean.

- [ ] **Step 6: Push the verified commits**

Run: `git push origin main`

Expected: `origin/main` advances to the final verified commit.
