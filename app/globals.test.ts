import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("campus ranking responsive title styles", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("클럽 로고 주변에 카드형 네모 장식을 만들지 않는다", () => {
    expect(css).toContain(
      ".campus-ranking-page .brand-lockup img {\n  width: 68px;\n  height: auto;\n  max-height: 52px;\n  padding: 0;\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  filter: none;\n  object-fit: contain;\n}"
    );
  });

  it("캠퍼스 랭킹 라벨은 좌상단의 중립적인 작은 라벨로 보여준다", () => {
    expect(css).toContain(
      ".campus-ranking-page .brand-lockup {\n  display: grid;\n  justify-items: start;\n  gap: 10px;\n  min-width: 0;\n}"
    );
    expect(css).toContain(
      ".campus-kicker {\n  display: inline-flex;\n  align-items: center;\n  width: fit-content;\n  min-height: 22px;\n  padding: 0 7px;\n  color: #4b5563;\n  background: transparent;\n  border: 1px solid #d7dce2;\n  border-radius: 999px;\n  font-size: 11px;\n  font-weight: 850;\n  letter-spacing: 0;\n}"
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
      ".campus-ranking-page .live-stamp {\n  min-height: 38px;\n  padding: 0 14px;\n  background: rgba(47, 125, 91, 0.12);\n  border-radius: 999px;\n}"
    );
  });

  it("선수 상세 최근 경기의 승패 표시는 상자 없이 글자 색으로만 보여준다", () => {
    expect(css).toContain(
      ".recent-match-item {\n  display: grid;\n  grid-template-columns: 42px minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 10px;\n  min-height: 54px;\n  padding: 10px 12px;\n  background: white;\n  border: 1px solid var(--campus-line);\n  border-radius: 8px;\n}"
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

  it("선수 상세 페이지는 전용 제목과 촘촘한 상단 여백을 사용한다", () => {
    expect(css).toContain(
      ".player-detail-hero .summary-inner {\n  padding: 16px 0 10px;\n}"
    );
  });

  it("최근 경기와 CAMPUS FEED 사이에 명확한 섹션 간격을 둔다", () => {
    expect(css).toContain(
      ".campus-ranking-page .club-match-section + .activity-strip {\n  margin-top: 24px;\n}"
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

  it("조용한 전체 너비 랭킹 표에 고정 순위와 점수 열을 둔다", () => {
    expect(css).toMatch(
      /\.national-ranking-section\s*\{[^}]*width:\s*100%;[^}]*\}/s
    );
    expect(css).toMatch(
      /\.national-ranking-table\s*\{[^}]*width:\s*100%;[^}]*table-layout:\s*fixed;[^}]*\}/s
    );
    expect(css).toMatch(
      /\.national-ranking-rank-column\s*\{[^}]*width:\s*72px;[^}]*\}/s
    );
    expect(css).toMatch(
      /\.national-ranking-score-column\s*\{[^}]*width:\s*140px;[^}]*\}/s
    );
  });

  it("동아리 이름은 줄바꿈하고 순위와 점수는 각 기준선에 고정한다", () => {
    expect(css).toMatch(
      /\.national-ranking-club\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;[^}]*\}/s
    );
    expect(css).toMatch(
      /\.national-ranking-rank\s*\{[^}]*text-align:\s*center;[^}]*\}/s
    );
    expect(css).toMatch(
      /\.national-ranking-score\s*\{[^}]*text-align:\s*right;[^}]*white-space:\s*nowrap;[^}]*\}/s
    );
  });

  it("데스크톱 산정 방식은 작은 팝오버로 배치한다", () => {
    expect(css).toMatch(
      /\.ranking-methodology-dialog\s*\{[^}]*position:\s*absolute;[^}]*width:\s*min\(360px,\s*calc\(100vw - 32px\)\);[^}]*border-radius:\s*8px;[^}]*\}/s
    );
  });

  it("640px 이하에서 표 열을 압축하고 산정 방식을 안전 영역이 있는 바텀 시트로 바꾼다", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-rank-column\s*\{[^}]*width:\s*48px;[^}]*\}[\s\S]*?\.national-ranking-score-column\s*\{[^}]*width:\s*96px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.ranking-methodology-dialog\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0;[^}]*width:\s*100%;[^}]*padding-bottom:\s*calc\(20px \+ env\(safe-area-inset-bottom\)\);[^}]*border-radius:\s*8px 8px 0 0;[^}]*\}/
    );
  });

  it("이전 마케팅 히어로와 대회 카드 계약을 제거한다", () => {
    expect(css).not.toMatch(/\.national-hero(?:\s|[-,{])/);
    expect(css).not.toContain(".tournament-grid");
    expect(css).not.toContain(".tournament-card");
  });
});
