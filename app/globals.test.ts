import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function findHoverSelectorsOutsideFinePointerMedia(css: string): string[] {
  const unsafeSelectors: string[] = [];
  const blockStack: Array<{ isFinePointerMedia: boolean }> = [];

  for (const line of css.split("\n")) {
    const trimmedLine = line.trim();
    const leadingClosings = trimmedLine.match(/^}+/)?.[0].length ?? 0;

    for (let index = 0; index < leadingClosings; index += 1) {
      blockStack.pop();
    }

    if (
      trimmedLine.includes(":hover") &&
      !blockStack.some((block) => block.isFinePointerMedia)
    ) {
      unsafeSelectors.push(trimmedLine);
    }

    const openingCount = (trimmedLine.match(/{/g) ?? []).length;
    const isFinePointerMedia =
      /^@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(
        trimmedLine
      );

    for (let index = 0; index < openingCount; index += 1) {
      blockStack.push({
        isFinePointerMedia: index === 0 && isFinePointerMedia,
      });
    }

    const closingCount = (trimmedLine.match(/}/g) ?? []).length;
    const remainingClosings = Math.max(0, closingCount - leadingClosings);

    for (let index = 0; index < remainingClosings; index += 1) {
      blockStack.pop();
    }
  }

  return unsafeSelectors;
}

describe("site footer link styles", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("푸터의 하이퍼링크에 항상 밑줄을 표시한다", () => {
    expect(css).toMatch(
      /\.site-footer a\s*\{[^}]*text-decoration-line:\s*underline;[^}]*\}/
    );
  });

  it("운영자와 문의 문구는 저작권 정보보다 조금만 강조되도록 작게 표시한다", () => {
    expect(css).toMatch(
      /\.site-footer-credit\s*\{[^}]*font-size:\s*14px;[^}]*\}/
    );
    expect(css).toMatch(
      /\.site-footer-inquiry\s*\{[^}]*font-size:\s*12px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.site-footer-credit\s*\{[^}]*font-size:\s*12px;[^}]*\}/
    );
  });
});

describe("shared tennis color palette", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("공통 그린 토큰도 딥 보틀 그린과 차분한 보조색으로 맞춘다", () => {
    expect(css).toMatch(
      /:root\s*\{[^}]*--green-950:\s*#0d2e27;[^}]*--green-800:\s*#1a3b2b;[^}]*--green-600:\s*#2d4a3e;[^}]*--green-100:\s*#e8efeb;[^}]*\}/
    );
  });
});

describe("campus ranking responsive title styles", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("클럽 로고 주변에 카드형 네모 장식을 만들지 않는다", () => {
    expect(css).toContain(
      ".campus-ranking-page .brand-lockup img {\n  width: 68px;\n  height: auto;\n  max-height: 52px;\n  padding: 0;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  filter: none;\n  object-fit: contain;\n}"
    );
  });

  it("캠퍼스 랭킹 라벨은 좌상단의 작은 테마 대응 라벨로 보여준다", () => {
    expect(css).toContain(
      ".campus-ranking-page .brand-lockup {\n  display: grid;\n  justify-items: start;\n  gap: 10px;\n  min-width: 0;\n}"
    );
    expect(css).toMatch(
      /\.campus-kicker\s*\{[^}]*color:\s*var\(--campus-label-ink\);[^}]*border:\s*1px solid var\(--campus-label-border\);[^}]*\}/
    );
  });

  it("랭킹 행의 전적과 최근 5경기 컬럼을 오른쪽 기준선에 맞춘다", () => {
    expect(css).toContain(
      ".campus-ranking-page .ranking-head,\n.campus-ranking-page .ranking-row {\n  grid-template-columns: 76px minmax(220px, 1fr) 156px 170px;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .record-cell {\n  justify-items: end;\n  text-align: right;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .recent-form {\n  justify-content: flex-end;\n  min-width: 170px;\n}"
    );
  });

  it("상위 10위 행과 하이라이트를 모바일에서도 촘촘하게 보여준다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page \.ranking-row\.is-featured\s*\{[^}]*min-height:\s*64px;/
    );
    expect(css).toMatch(
      /\.campus-podium-grid\s*\{[^}]*grid-template-columns:\s*1fr 1\.15fr 1fr;/
    );
    expect(css).toMatch(
      /\.campus-recent-record-row\s*\{[^}]*grid-template-columns:\s*86px minmax\(0,\s*1fr\) auto;[^}]*min-height:\s*49px;/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.ranking-row\.is-featured\s*\{[^}]*grid-template-columns:\s*60px minmax\(0,\s*1fr\) 84px;[^}]*min-height:\s*58px;/
    );
    expect(css).not.toContain(".campus-ranking-page .activity-strip {");
  });

  it("모바일의 모든 선수 행에 최근 5경기 슬롯을 유지하면서 행 높이를 줄인다", () => {
    expect(css).not.toContain(
      ".campus-ranking-page .ranking-row.is-compact .recent-form {\n    display: none;\n  }"
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.ranking-row\.is-featured\s*\{[^}]*min-height:\s*58px;[^}]*padding:\s*4px 0;/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.ranking-row\.is-compact\s*\{[^}]*min-height:\s*50px;[^}]*padding:\s*4px 0;/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.ranking-row\.is-compact \.recent-form\s*\{[^}]*display:\s*flex;[^}]*grid-column:\s*2 \/ 4;[^}]*grid-row:\s*2;/
    );
  });

  it("대회 성적의 교내 랭킹 이동은 밑줄 없는 텍스트 링크로 보여준다", () => {
    expect(css).toMatch(
      /\.national-club-campus-ranking-text-link\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*text-decoration:\s*none;/
    );
    expect(css).not.toMatch(
      /\.national-club-campus-ranking-text-link\s*\{[^}]*border-bottom:/
    );
  });

  it("히어로 통계는 카드형 네모 없이 한 줄 숫자 묶음과 오른쪽 시간 pill로 보여준다", () => {
    expect(css).toContain(
      ".campus-ranking-page .hero-meta-row {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 18px;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .hero-stats div {\n  min-width: 0;\n  padding: 0;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .hero-live-actions {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .live-stamp {\n  min-height: 38px;\n  padding: 0 14px;\n  background: rgba(47, 125, 91, 0.08);\n  border-radius: 999px;\n}"
    );
  });

  it("히어로 설명과 경기 입력 버튼은 모바일에서도 과하게 커 보이지 않는다", () => {
    expect(css).toContain(
      ".campus-ranking-page .subtitle {\n  margin-bottom: 16px;\n  color: var(--campus-ink);\n  font-size: 19px;"
    );
    expect(css).toContain(
      ".match-entry-button {\n  min-height: 36px;\n  padding: 0 12px;"
    );
    expect(css).toContain(
      "  border-radius: 8px;\n  font-size: 13px;\n  font-weight: 850;"
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.subtitle\s*\{[^}]*font-size:\s*14px;/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*860px\)[\s\S]*?\.campus-ranking-page \.subtitle\s*\{[^}]*font-size:\s*18px;/
    );
  });

  it("실시간 상태 점은 밝은 초록색과 넓은 광원으로 또렷하게 표시한다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page \.live-indicator\s*\{[^}]*width:\s*10px;[^}]*height:\s*10px;[^}]*background:\s*#22c55e;[^}]*animation:\s*campus-live-indicator-pulse/
    );
    expect(css).toMatch(
      /@keyframes campus-live-indicator-pulse\s*\{[^]*0 0 14px rgba\(34, 197, 94, 0\.8\);[^]*\}/
    );
  });

  it("선수 상세 최근 경기의 승패 표시는 상자 없이 글자 색으로만 보여준다", () => {
    expect(css).toContain(
      ".recent-match-item {\n  display: grid;\n  grid-template-columns: 42px minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 10px;\n  min-height: 58px;\n  padding: 15px 0;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".recent-match-item .result-letter {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  justify-self: center;\n  color: var(--campus-muted);\n  font-size: 18px;\n  font-weight: 950;\n  line-height: 1;\n}"
    );
    expect(css).toContain(
      ".result-letter.is-win {\n  color: #2563eb;\n}"
    );
    expect(css).toContain(
      ".result-letter.is-loss {\n  color: var(--campus-red);\n}"
    );
    expect(css).toContain(
      ".season-record-item span,\n.opponent-record-item span,\n.recent-match-main span {"
    );
    expect(css).not.toContain(".recent-match-item span {");
    expect(css).not.toContain(".result-pill {");
  });

  it("선수 상세 페이지는 중첩 카드 없이 열린 기록 레이아웃을 사용한다", () => {
    expect(css).toContain(
      ".campus-ranking-page.player-detail-page {\n  background: white;\n}"
    );
    expect(css).toContain(
      ".player-detail-panel {\n  margin: 0;\n  padding: 28px 20px 56px;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  box-shadow: none;\n}"
    );
    expect(css).toContain(
      ".detail-rank {\n  display: inline-flex;\n  align-items: center;\n  min-height: 0;\n  padding: 0;\n  color: var(--campus-red);\n  background: transparent;\n  border-radius: 0;"
    );
    expect(css).toContain(
      ".detail-stat-strip {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 0;\n  margin: 0 0 38px;\n  overflow: visible;\n  background: transparent;\n  border-top: 1px solid var(--campus-line);\n  border-bottom: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".detail-section {\n  padding: 28px 0 0;\n  background: transparent;\n  border: 0;\n  border-top: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".season-record-item,\n.opponent-record-item {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 12px;\n  min-height: 52px;\n  padding: 15px 0;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".recent-match-item {\n  display: grid;\n  grid-template-columns: 42px minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 10px;\n  min-height: 58px;\n  padding: 15px 0;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
    expect(css).toContain(
      ".match-score {\n  justify-self: end;\n  min-width: 42px;\n  padding: 0;\n  color: var(--campus-ink);\n  background: transparent;\n  border: 0;\n  border-radius: 0;"
    );
  });

  it("선수 상세 페이지는 전용 제목과 촘촘한 상단 여백을 사용한다", () => {
    expect(css).toContain(
      ".player-detail-hero .summary-inner {\n  padding: 16px 0 10px;\n}"
    );
  });

  it("캠퍼스 랭킹 전체를 흰 지면 위의 열린 섹션으로 이어서 보여준다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page:not\(\.player-detail-page\)\s*\{[^}]*background:\s*white;[^}]*\}/
    );
    expect(css).toContain(
      ".campus-ranking-page .hero-copy {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  min-height: 142px;\n  padding: 20px;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  box-shadow: none;\n}"
    );
    expect(css).toContain(
      ".campus-highlight-section {\n  padding: 26px 20px 28px;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  box-shadow: none;\n}"
    );
    expect(css).toContain(
      ".campus-highlight-section + .campus-highlight-section {\n  margin-top: 0;\n  border-top: 1px solid var(--campus-line);\n}"
    );
    expect(css).toContain(
      ".campus-result-update {\n  position: relative;\n  margin: 0 16px;\n  padding: 20px 0 22px;\n  background: transparent;\n  border: 0;\n  border-top: 1px solid var(--campus-line);\n}"
    );
    expect(css).toContain(
      ".campus-result-update::before {\n  position: absolute;\n  top: 20px;\n  bottom: 22px;\n  left: -12px;\n  width: 3px;\n  background: var(--campus-red);\n  content: \"\";\n}"
    );
    expect(css).toContain(
      ".campus-result-update-title {\n  display: block;\n  margin-top: 5px;\n  color: var(--campus-ink);\n  font-size: 16px;\n  font-weight: 900;\n  line-height: 1.45;\n}"
    );
    expect(css).toContain(
      ".campus-result-update-link {\n  display: inline-flex;\n  align-items: center;\n  margin-top: 9px;\n  color: var(--campus-green);\n  font-size: 13px;\n  font-weight: 850;\n  text-decoration: none;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-heading {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 16px;\n  margin: 0;\n  padding: 26px 20px 12px;\n  background: transparent;\n  border-top: 1px solid var(--campus-line);\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .ranking-board {\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  box-shadow: none;\n}"
    );
    expect(css).toMatch(
      /\.campus-ranking-page \.rank-cell span\s*\{[^}]*color:\s*var\(--campus-ink\);[^}]*background:\s*transparent;[^}]*border-radius:\s*0;/
    );
    expect(css).toMatch(
      /\.rank-movement\.is-up\s*\{[^}]*color:\s*#168a4b;[^}]*\}/
    );
    expect(css).toMatch(
      /\.rank-movement\.is-down\s*\{[^}]*color:\s*#d62961;[^}]*\}/
    );
    expect(css).toContain(
      ".campus-ranking-page .rank-cell {\n  display: grid;\n  grid-template-columns: 22px 26px;\n  align-items: center;\n  justify-content: center;\n  column-gap: 4px;\n}"
    );
    expect(css).toMatch(
      /\.campus-ranking-page \.rank-cell span\s*\{[^}]*text-align:\s*right;[^}]*font-variant-numeric:\s*tabular-nums;/
    );
    expect(css).toMatch(
      /\.campus-ranking-history-link\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*text-decoration:\s*none;/
    );
  });

  it("최근 30일 기록은 터치 스크롤 중 hover 색으로 바뀌지 않는다", () => {
    expect(css).toContain(
      ".campus-recent-record-row {\n  -webkit-tap-highlight-color: transparent;"
    );
    expect(css).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{[^]*\.campus-recent-record-row:hover\s*\{[^}]*color:\s*var\(--campus-red\);[^}]*background:\s*var\(--campus-hover-bg\);[^}]*\}[^]*\}/
    );
    expect(css).not.toMatch(
      /\n\.campus-recent-record-row:hover\s*\{/
    );
  });

  it("모바일 랭킹의 순위와 변동 숫자를 한눈에 읽을 수 있게 표시한다", () => {
    expect(css).toMatch(
      /@media \(max-width: 560px\)\s*\{[^]*?\.campus-ranking-page \.ranking-row\.is-featured \.rank-cell span\s*\{[^}]*font-size:\s*15px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)\s*\{[^]*?\.campus-ranking-page \.ranking-row\.is-compact \.rank-cell span\s*\{[^}]*font-size:\s*13px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)\s*\{[^]*?\.campus-ranking-page \.rank-movement\s*\{[^}]*font-size:\s*12px;[^}]*\}/
    );
  });

  it("사이트 전체 hover 피드백은 마우스가 있는 환경에서만 활성화한다", () => {
    expect(findHoverSelectorsOutsideFinePointerMedia(css)).toEqual([]);
  });

  it("터치 환경에서는 링크와 버튼의 기본 탭 하이라이트를 숨긴다", () => {
    expect(css).toMatch(
      /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?a,\s*button,\s*\[role="button"\],\s*summary\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent;[^}]*\}/
    );
  });

  it("전체 경기 기록은 개별 카드 대신 가로 구분선 목록으로 보여준다", () => {
    expect(css).toContain(
      ".matches-page .club-match-section {\n  padding: 26px 20px 32px;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  box-shadow: none;\n}"
    );
    expect(css).toContain(
      ".matches-page .club-match-list {\n  gap: 0;\n  border-top: 1px solid var(--campus-line);\n}"
    );
    expect(css).toContain(
      ".matches-page .club-match-card {\n  padding: 16px 0;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px solid var(--campus-line);\n  border-radius: 0;\n}"
    );
  });

  it("모바일 경기 입력창은 화면 아래에 붙는 시트로 보여준다", () => {
    expect(css).toContain(
      "  .match-entry-backdrop {\n    align-items: flex-end;\n    padding: 0;\n  }"
    );
    expect(css).toContain(
      "  .match-entry-dialog {\n    width: 100%;\n    max-height: 84vh;\n    border-right: 0;\n    border-bottom: 0;\n    border-left: 0;\n    border-radius: 8px 8px 0 0;\n  }"
    );
  });

  it("좌상단 루트 이동 버튼은 두꺼운 chevron 아이콘으로 보여준다", () => {
    expect(css).toContain(
      ".national-back-link {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 38px;\n  height: 38px;\n  margin-bottom: 10px;\n  color: var(--campus-ink);\n  text-decoration: none;\n  background: transparent;\n  border-radius: 999px;\n}"
    );
    expect(css).toContain(
      ".national-back-icon {\n  width: 18px;\n  height: 18px;\n  border-bottom: 5px solid currentColor;\n  border-left: 5px solid currentColor;\n  border-radius: 3px;\n  transform: rotate(45deg);\n}"
    );
    expect(css).toContain(
      ".national-back-link.is-labeled {\n  width: fit-content;\n  padding: 0 10px 0 8px;\n  gap: 8px;\n}"
    );
    expect(css).toContain(
      ".national-back-label {\n  font-size: 12px;\n  font-weight: 700;\n  line-height: 1;\n}"
    );
  });

  it("관리자 현황은 데스크톱 2열, 모바일 1열로 정렬한다", () => {
    expect(css).toContain(
      ".admin-club-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));"
    );
    expect(css).toContain(
      "  .admin-club-grid {\n    grid-template-columns: 1fr;\n  }"
    );
    expect(css).toContain(
      ".admin-policy-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  align-items: start;"
    );
    expect(css).toContain(
      ".admin-policy-group {\n  align-self: start;\n}"
    );
  });

  it("선수 관리 목록은 데스크톱 고정 열과 모바일 압축 행을 사용한다", () => {
    expect(css).toContain(
      ".admin-player-table-head,\n.admin-player-row {\n  display: grid;\n  grid-template-columns: 72px minmax(180px, 1fr) 110px 170px;"
    );
    expect(css).toContain(
      "  .admin-player-table-head {\n    display: none;\n  }"
    );
    expect(css).toContain(
      "  .admin-player-row {\n    grid-template-columns: 44px minmax(0, 1fr) auto;"
    );
    expect(css).toContain(
      "  .admin-player-actions {\n    grid-column: 2 / 4;"
    );
  });

  it("순위 변경 미리보기는 중첩 카드 없이 안정적인 두 열로 정렬한다", () => {
    expect(css).toContain(
      ".admin-rank-preview {\n  display: grid;\n  gap: 8px;\n  min-width: 0;\n  padding: 12px 0;\n  border-top: 1px solid #e6e9ed;\n  border-bottom: 1px solid #e6e9ed;"
    );
    expect(css).toContain(
      ".admin-rank-preview li {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 12px;"
    );
    expect(css).toContain(
      "  .admin-player-actions {\n    grid-column: 2 / 4;\n    flex-wrap: wrap;"
    );
    expect(css).not.toContain(
      ".admin-rank-preview li {\n  background: white;"
    );
  });

  it("관리자 다이얼로그는 낮은 화면에서도 하단 작업 버튼까지 스크롤할 수 있다", () => {
    expect(css).toContain(
      ".admin-player-dialog {\n  display: flex;\n  width: min(100%, 420px);\n  max-height: calc(100dvh - 40px);\n  overflow: hidden;\n  flex-direction: column;"
    );
    expect(css).toContain(
      ".admin-player-dialog form {\n  display: grid;\n  min-height: 0;\n  padding: 18px;\n  overflow-y: auto;"
    );
    expect(css).toContain(
      "  .admin-player-dialog {\n    width: 100%;\n    max-height: calc(100dvh - 16px);"
    );
  });

  it("운영 규칙 링크는 설명과 같은 행에 두고 통계 영역을 아래로 밀지 않는다", () => {
    expect(css).toContain(
      ".campus-ranking-page .hero-copy-heading {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  align-items: baseline;\n  gap: 16px;\n  margin-bottom: 14px;\n}"
    );
    expect(css).toContain(
      ".campus-ranking-page .hero-copy-heading .subtitle {\n  min-width: 0;\n  margin: 0;\n}"
    );
  });

  it("PC에서는 클럽 제목 줄을 한 줄로 이어 붙이고 모바일에서만 줄바꿈한다", () => {
    expect(css).toContain(".club-title-line {\n  display: inline;\n}");
    expect(css).toContain(
      ".club-title-line + .club-title-line::before {\n  content: \" \";\n}"
    );
    expect(css).toContain(
      ".club-title-line {\n    display: block;\n  }"
    );
  });
});

describe("national ranking responsive contracts", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("전국 랭킹은 톤다운된 딥 보틀 그린 팔레트를 사용한다", () => {
    expect(css).toMatch(
      /\.national-page\s*\{[^}]*--national-ink:\s*#171b1f;[^}]*--national-muted:\s*#66717c;[^}]*--national-line:\s*#dfe4e1;[^}]*--national-accent:\s*#1a3b2b;[^}]*--national-accent-strong:\s*#0d2e27;[^}]*--national-accent-soft:\s*#edf2ef;[^}]*\}/
    );
  });

  it("대학명과 점수는 잉크색을 유지하고 펼침 상태는 배경으로만 구분한다", () => {
    expect(css).toMatch(
      /\.national-ranking-club strong\s*\{[^}]*color:\s*var\(--national-ink\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-main-row\[data-expanded="true"\] td\s*\{[^}]*background:\s*var\(--national-accent-soft\);[^}]*\}/
    );
    expect(css).not.toMatch(
      /\.national-ranking-main-row\[data-expanded="true"\][\s\S]*?\.national-ranking-club strong\s*\{[^}]*color:\s*var\(--national-accent\);[^}]*\}/
    );
  });

  it("랭킹 부문을 채움 없는 텍스트 탭과 선택 밑줄로 표시한다", () => {
    expect(css).toMatch(
      /\.national-ranking-toolbar\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-tabs\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*padding:\s*0;[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-tabs button\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*border-bottom:\s*2px solid transparent;[^}]*border-radius:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-tabs button\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--national-ink\);[^}]*background:\s*transparent;[^}]*border-bottom-color:\s*var\(--national-accent\);[^}]*\}/
    );
  });

  it("랭킹 표는 외곽 프레임 없이 행 사이 가로선만 사용한다", () => {
    expect(css).toMatch(
      /\.national-ranking-surface\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-table th,\s*\.national-ranking-table td\s*\{[^}]*border:\s*0;[^}]*border-bottom:\s*1px solid var\(--national-line\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-table th\s*\{[^}]*background:\s*transparent;[^}]*\}/
    );
  });

  it("조용한 전체 너비 랭킹 표에 고정 순위와 점수 열을 둔다", () => {
    expect(css).toMatch(
      /\.national-ranking-section\s*\{[\s\S]*?width:\s*100%;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-table\s*\{[\s\S]*?width:\s*100%;[^}]*table-layout:\s*fixed;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-rank-column\s*\{[\s\S]*?width:\s*72px;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-score-column\s*\{[\s\S]*?width:\s*136px;[^}]*\}/
    );
    expect(css).not.toContain(".national-ranking-action-column");
    expect(css).toMatch(
      /\.national-ranking-table th:last-child\s*\{[^}]*text-align:\s*right;[^}]*\}/
    );
    expect(css).not.toContain(
      ".national-ranking-table th:nth-last-child(-n + 2)"
    );
  });

  it("동아리 이름은 줄바꿈하고 순위와 점수는 각 기준선에 고정한다", () => {
    expect(css).toMatch(
      /\.national-ranking-club\s*\{[\s\S]*?min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-rank\s*\{[\s\S]*?text-align:\s*center;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-score\s*\{[\s\S]*?display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*flex-end;[^}]*gap:\s*12px;[^}]*white-space:\s*nowrap;[^}]*\}/
    );
  });

  it("레퍼런스 색상으로 금·은·브론즈 순위 번호를 구분한다", () => {
    expect(css).toMatch(
      /\.national-ranking-rank\[data-rank-tier="gold"\]\s*\{[^}]*color:\s*#ec9a01;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-rank\[data-rank-tier="silver"\]\s*\{[^}]*color:\s*#435f7a;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-rank\[data-rank-tier="bronze"\]\s*\{[^}]*color:\s*#ad5600;[^}]*\}/
    );
  });

  it("헤더의 랭킹 계산 방식 링크를 팝오버 없이 조용한 텍스트 링크로 표시한다", () => {
    expect(css).toMatch(
      /\.national-methodology-link\s*\{[^}]*display:\s*inline-flex;[^}]*margin-top:\s*8px;[^}]*color:\s*var\(--national-accent\);[^}]*font-weight:\s*800;[^}]*text-underline-offset:\s*4px;[^}]*\}/
    );
    expect(css).not.toContain(".ranking-methodology-info");
    expect(css).not.toContain(".ranking-methodology-trigger");
    expect(css).not.toContain(".ranking-methodology-tooltip");
  });

  it("최근 입상 안내의 검정 왕관을 글자 기준선에 맞게 살짝 올린다", () => {
    expect(css).toMatch(
      /\.national-ranking-crown-guide img\s*\{[^}]*transform:\s*translateY\(-1px\);[^}]*\}/
    );
  });

  it("오류 상태의 다시 시도 링크를 기존 전국 랭킹 링크처럼 표시한다", () => {
    expect(css).toMatch(
      /\.national-status a\s*\{[^}]*display:\s*inline-flex;[^}]*color:\s*var\(--national-accent\);[^}]*font-weight:\s*800;[^}]*text-underline-offset:\s*4px;[^}]*\}/
    );
  });

  it("탭의 키보드 포커스는 하단선으로, 다른 조작 요소는 액센트 윤곽선으로 표시한다", () => {
    expect(css).toMatch(
      /\.national-ranking-tabs button:focus-visible\s*\{[^}]*outline:\s*0;[^}]*box-shadow:\s*inset 0 -4px var\(--national-accent\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-methodology-link:focus-visible,[\s\S]*?\.national-ranking-honor-trigger:focus-visible,[\s\S]*?\.national-ranking-club-disclosure:focus-visible,[\s\S]*?\.national-ranking-results-link:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--national-accent\);[^}]*\}/
    );
  });

  it("랭킹 행 전체를 펼치기 버튼으로 누를 수 있고 왕관 조작은 버튼보다 위에 둔다", () => {
    expect(css).toMatch(
      /\.national-ranking-main-row\s*\{[^}]*cursor:\s*pointer;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-club-column\s*\{[^}]*position:\s*relative;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honors\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;[^}]*\}/
    );
  });

  it("동아리명은 hover나 열린 상태에서도 포인트색으로 바꾸지 않는다", () => {
    expect(css).not.toMatch(
      /\.national-ranking-club-column:hover[\s\S]*?\.national-ranking-club strong/
    );
    expect(css).not.toMatch(
      /\.national-ranking-main-row\[data-expanded="true"\][\s\S]*?\.national-ranking-club strong\s*\{[^}]*color:\s*var\(--national-accent\);[^}]*\}/
    );
  });

  it("최고 성적 행은 높이와 투명도를 전환하고 모션 감소 설정을 존중한다", () => {
    expect(css).toMatch(
      /\.national-ranking-expansion\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*0fr;[^}]*opacity:\s*0;[^}]*transition:[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-detail-row\[data-open="true"\][\s\S]*?\.national-ranking-expansion\s*\{[^}]*grid-template-rows:\s*1fr;[^}]*opacity:\s*1;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.national-ranking-expansion,[\s\S]*?\.national-ranking-row-chevron\s*\{[^}]*transition:\s*none;[^}]*\}/
    );
  });

  it("왕관을 작게 유지하고 모바일에서 동아리 정보 두 번째 줄에 배치한다", () => {
    expect(css).toMatch(
      /\.national-ranking-honors\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honor-trigger\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honor-trigger\s*\{[^}]*cursor:\s*pointer;[^}]*\}/
    );
    expect(css).not.toMatch(
      /\.national-ranking-honor-trigger\s*\{[^}]*cursor:\s*help;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honor-trigger img\s*\{[^}]*width:\s*21px;[^}]*height:\s*16px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-club-cell\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*grid-template-rows:\s*auto auto;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-club-meta\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*2;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-operating-badge\.is-desktop\s*\{[^}]*display:\s*none;[^}]*\}[\s\S]*?\.national-ranking-operating-badge\.is-mobile\s*\{[^}]*display:\s*inline-flex;[^}]*\}/
    );
  });

  it("성적 목록의 왕관은 행 높이를 밀어내지 않는 작은 크기를 사용한다", () => {
    expect(css).toMatch(
      /\.national-result-crown\s*\{[^}]*width:\s*18px;[^}]*height:\s*14px;[^}]*object-fit:\s*contain;[^}]*\}/
    );
  });

  it("동아리 전체 성적은 고정된 작은 왕관 열로 기록 기준선을 맞춘다", () => {
    expect(css).toMatch(
      /\.national-club-results-list li\s*\{[^}]*grid-template-columns:\s*24px 110px minmax\(0,\s*1fr\) 80px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-club-results-list li\s*\{[^}]*grid-template-columns:\s*20px 64px minmax\(0,\s*1fr\) 54px;[^}]*\}/
    );
  });

  it("640px 이하에서 표 열을 압축한다", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-rank-column\s*\{[^}]*width:\s*48px;[^}]*\}[\s\S]*?\.national-ranking-score-column\s*\{[^}]*width:\s*94px;[^}]*\}[\s\S]*?\.national-ranking-score\s*\{[^}]*gap:\s*8px;[^}]*\}/
    );
  });

  it("모바일 동아리 성적 목록은 왕관을 포함한 네 열로 압축하고 긴 팀명을 줄바꿈한다", () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-club-results-list li\s*\{[^}]*grid-template-columns:\s*20px 64px minmax\(0,\s*1fr\) 54px;[^}]*gap:\s*8px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-club-result-competition strong\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*\}/
    );
  });

  it("이전 마케팅 히어로와 대회 카드 계약을 제거한다", () => {
    expect(css).not.toMatch(/\.national-hero(?:\s|[-,{])/);
    expect(css).not.toContain(".tournament-grid");
    expect(css).not.toContain(".tournament-card");
  });
});

describe("methodology accessibility contracts", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("계산 방식 문서도 전국 랭킹과 같은 딥 그린 팔레트를 공유한다", () => {
    expect(css).toMatch(
      /\.methodology-page\s*\{[^}]*--methodology-ink:\s*#171b1f;[^}]*--methodology-muted:\s*#66717c;[^}]*--methodology-line:\s*#dfe4e1;[^}]*--methodology-accent:\s*#1a3b2b;[^}]*--methodology-soft:\s*#edf2ef;[^}]*\}/
    );
  });

  it("키보드 포커스 윤곽선은 배경과 충분히 대비되는 불투명 색을 사용한다", () => {
    expect(css).toMatch(
      /\.methodology-table-scroll:focus-visible,[\s\S]*?\.methodology-references a:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--methodology-accent\);[^}]*\}/
    );
  });

  it("모바일 방법론 표는 가로 스크롤 없이 셀 안에서 줄바꿈한다", () => {
    expect(css).toMatch(
      /\.methodology-table-scroll\s*\{[^}]*overflow-x:\s*visible;[^}]*\}/
    );
    expect(css).toMatch(
      /\.methodology-table\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*table-layout:\s*fixed;[^}]*\}/
    );
    expect(css).toMatch(
      /\.methodology-table th,\s*\.methodology-table td\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*\}/
    );
    expect(css).not.toMatch(/\.methodology-table\s*\{[^}]*min-width:\s*(?:480|520)px;/);
  });
});

describe("theme color contracts", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("밝은 화면과 어두운 화면이 같은 의미 기반 색상 토큰을 공유한다", () => {
    expect(css).toMatch(
      /:root\s*\{[^}]*--bg-canvas:\s*#f5f7f6;[^}]*--bg-surface:\s*#ffffff;[^}]*--text-primary:\s*#171b1f;[^}]*--brand:\s*#1a3b2b;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark\s*\{[^}]*--bg-canvas:\s*#101820;[^}]*--bg-surface:\s*#151f28;[^}]*--text-primary:\s*#f2f5f7;[^}]*--brand:\s*#a7c7b7;[^}]*\}/
    );
  });

  it("브라우저 기본 컨트롤도 선택한 테마의 색상 체계를 따른다", () => {
    expect(css).toMatch(/html\s*\{[^}]*color-scheme:\s*light;[^}]*\}/);
    expect(css).toMatch(/html\.dark\s*\{[^}]*color-scheme:\s*dark;[^}]*\}/);
  });

  it.each([
    ".methodology-page",
    ".campus-rules-page",
    ".campus-ranking-page",
    ".national-page",
    ".admin-page",
  ])("%s의 자체 팔레트도 다크 모드 토큰으로 전환한다", (selector) => {
    expect(css).toContain(`.dark ${selector} {`);
  });

  it("다크 모드의 입력 요소와 주요 표면은 밝은 배경으로 남지 않는다", () => {
    expect(css).toMatch(
      /\.dark \.admin-page :where\(input, select, textarea\)\s*\{[^}]*background:\s*var\(--bg-subtle\);[^}]*color:\s*var\(--text-primary\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page\.player-detail-page\s*\{[^}]*background:\s*var\(--bg-canvas\);[^}]*\}/
    );
  });

  it("테마 토글은 footer 오른쪽 하단의 작은 pill로 배치한다", () => {
    expect(css).toMatch(
      /\.site-footer-bottom\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;[^}]*\}/
    );
    expect(css).toMatch(
      /\.theme-toggle\s*\{[^}]*width:\s*64px;[^}]*height:\s*34px;[^}]*border-radius:\s*999px;[^}]*\}/
    );
    expect(css).not.toMatch(/\.theme-menu\s*\{[^}]*position:\s*fixed;/);
  });

  it("다크 모드의 초록 텍스트는 밝은 세이지 색으로 충분히 대비한다", () => {
    expect(css).toMatch(
      /\.dark \.campus-ranking-page\s*\{[^}]*--campus-green:\s*#a7c7b7;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.rank-movement\.is-up\s*\{[^}]*color:\s*#6bd99d;[^}]*\}/
    );
  });

  it("PETC 단색 로고만 다크 모드에서 밝게 변환한다", () => {
    expect(css).toMatch(
      /\.dark \.campus-club-logo\.is-monochrome\s*\{[^}]*filter:\s*[^;]+;[^}]*\}/
    );
  });

  it("캠퍼스 라벨과 hover는 라이트·다크 전용 토큰을 사용한다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page\s*\{[^}]*--campus-label-ink:\s*#4b5563;[^}]*--campus-label-border:\s*#d7dce2;[^}]*--campus-hover-bg:\s*#fafbfc;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page\s*\{[^}]*--campus-label-ink:\s*#b8d6c7;[^}]*--campus-label-border:\s*rgba\(184, 214, 199, 0\.55\);[^}]*--campus-hover-bg:\s*#18232b;[^}]*\}/
    );
    expect(css).toMatch(
      /\.campus-podium-player:hover\s*\{[^}]*background:\s*var\(--campus-hover-bg\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.campus-recent-record-row:hover\s*\{[^}]*background:\s*var\(--campus-hover-bg\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.campus-ranking-page \.ranking-row:hover\s*\{[^}]*background:\s*var\(--campus-hover-bg\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page \.ranking-row:hover\s*\{[^}]*background:\s*var\(--campus-hover-bg\);[^}]*\}/
    );
  });

  it("다크 대회 안내는 열린 배경을 유지한다", () => {
    expect(css).toMatch(
      /\.dark \.campus-result-update\s*\{[^}]*background:\s*transparent;[^}]*\}/
    );
  });

  it("다크 로딩 행은 투명하고 skeleton shimmer는 명암 토큰을 유지한다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page\s*\{[^}]*--campus-skeleton-edge:\s*#e9eeeb;[^}]*--campus-skeleton-highlight:\s*#f7f9f8;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page\s*\{[^}]*--campus-skeleton-edge:\s*#22313a;[^}]*--campus-skeleton-highlight:\s*#3b4b56;[^}]*\}/
    );
    expect(css).toMatch(
      /\.campus-ranking-skeleton-rank,[\s\S]*?background:\s*linear-gradient\([\s\S]*?var\(--campus-skeleton-highlight\)[\s\S]*?\);[\s\S]*?animation:\s*campus-ranking-skeleton-shimmer/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-loading-row\s*\{[^}]*background:\s*transparent;[^}]*\}/
    );
    expect(css).toMatch(
      /\.campus-ranking-loading-indicator\s*\{[^}]*background:\s*var\(--campus-green\);[^}]*animation:\s*campus-ranking-loading-pulse[^;]*;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-loading-indicator\s*\{[^}]*background:\s*var\(--campus-green\);[^}]*box-shadow:[^}]*\}/
    );
  });

  it("전국 랭킹 표와 탭은 다크 모드에서도 별도 박스 배경을 만들지 않는다", () => {
    expect(css).toMatch(
      /\.national-ranking-surface\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.national-ranking-surface\s*\{[^}]*background:\s*transparent;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.national-ranking-tabs\s*\{[^}]*background:\s*transparent;[^}]*\}/
    );
  });

  it("최근 경기 W는 모바일에서도 읽을 수 있는 크기와 다크 전용 배경을 사용한다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page \.ranking-row\.is-featured \.form-dot\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;[^}]*font-size:\s*11px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*?\.campus-ranking-page \.ranking-row\.is-featured \.form-dot\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;[^}]*font-size:\s*9px;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page \.form-dot\.is-win\s*\{[^}]*color:\s*#f7fbf9;[^}]*background:\s*#347a59;[^}]*\}/
    );
  });

  it("경기 입력과 제출 버튼은 다크 모드 전용 전경·배경 토큰을 공유한다", () => {
    expect(css).toMatch(
      /\.campus-ranking-page\s*\{[^}]*--campus-action-bg:\s*#1f2328;[^}]*--campus-action-ink:\s*#ffffff;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.campus-ranking-page\s*\{[^}]*--campus-action-bg:\s*#a7c7b7;[^}]*--campus-action-ink:\s*#101820;[^}]*\}/
    );
    expect(css).toMatch(
      /\.match-entry-button\s*\{[^}]*color:\s*var\(--campus-action-ink\);[^}]*background:\s*var\(--campus-action-bg\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.match-entry-submit\s*\{[^}]*color:\s*var\(--campus-action-ink\);[^}]*background:\s*var\(--campus-action-bg\);[^}]*\}/
    );
  });

  it("운영 페이지의 탭·필터·정책 제목도 어두운 표면을 유지한다", () => {
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-club-tabs,\s*\.dark \.admin-page \.admin-match-filter\s*\{[^}]*border-color:\s*var\(--admin-line\);[^}]*background:\s*var\(--admin-soft\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-club-tabs button\[aria-pressed="true"\],\s*\.dark \.admin-page \.admin-match-filter button\[aria-pressed="true"\]\s*\{[^}]*color:\s*var\(--admin-ink\);[^}]*background:\s*#26333c;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-policy-group h3\s*\{[^}]*background:\s*var\(--admin-soft\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-primary-button:disabled,\s*\.dark \.admin-page \.admin-monthly-summary > button:disabled\s*\{[^}]*color:\s*#81909c;[^}]*background:\s*#26333c;[^}]*border-color:\s*#26333c;[^}]*\}/
    );
  });

  it("운영 페이지의 기본·보조·강조 텍스트가 다크 모드 토큰을 사용한다", () => {
    expect(css).toMatch(
      /\.dark \.admin-page :is\([\s\S]*?\.admin-rule-summary strong,[\s\S]*?\.admin-monthly-summary strong[\s\S]*?\)\s*\{[^}]*color:\s*var\(--admin-ink\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page :is\([\s\S]*?\.admin-root-link,[\s\S]*?\.admin-player-table-head,[\s\S]*?\.admin-monthly-table-head[\s\S]*?\)\s*\{[^}]*color:\s*var\(--admin-muted\);[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page :is\([\s\S]*?\.admin-kicker,[\s\S]*?\.admin-season-label[\s\S]*?\)\s*\{[^}]*color:\s*#79b9c8;[^}]*\}/
    );
  });

  it("운영 페이지의 성공·경고·오류 상태는 다크 모드 고대비 색을 사용한다", () => {
    expect(css).toMatch(
      /\.dark \.admin-page :is\([\s\S]*?\.admin-policy-group strong\.is-open,[\s\S]*?\.admin-match-actions button\.is-restore[\s\S]*?\)\s*\{[^}]*color:\s*#6bd99d;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page :is\([\s\S]*?\.admin-policy-group strong\.is-sensitive,[\s\S]*?\.admin-monthly-row\.is-penalized \.admin-monthly-expected[\s\S]*?\)\s*\{[^}]*color:\s*#ff8f86;[^}]*\}/
    );
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-monthly-automation\.is-skipped \.admin-monthly-automation-state,\s*\.dark \.admin-page \.admin-monthly-player span\.is-inactive\s*\{[^}]*color:\s*#e7b96f;[^}]*\}/
    );
  });

  it("월간 정산의 비활성 버튼도 밝은 박스로 남지 않는다", () => {
    expect(css).toMatch(
      /\.dark \.admin-page \.admin-primary-button:disabled,\s*\.dark \.admin-page \.admin-monthly-summary > button:disabled\s*\{[^}]*color:\s*#81909c;[^}]*background:\s*#26333c;[^}]*border-color:\s*#26333c;[^}]*\}/
    );
  });
});
