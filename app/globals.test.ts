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
      /\.national-ranking-score-column\s*\{[\s\S]*?width:\s*140px;[^}]*\}/
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
      /\.national-ranking-score\s*\{[\s\S]*?text-align:\s*right;[^}]*white-space:\s*nowrap;[^}]*\}/
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
      /\.national-methodology-link:focus-visible,[\s\S]*?\.national-ranking-honor-trigger:focus-visible,[\s\S]*?\.national-ranking-club-link:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--national-accent\);[^}]*\}/
    );
  });

  it("동아리 이름 칸 전체를 링크로 누를 수 있고 왕관 조작은 링크보다 위에 둔다", () => {
    expect(css).toMatch(
      /\.national-ranking-club-column\s*\{[^}]*position:\s*relative;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-club-link::after\s*\{[^}]*content:\s*"";[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honors\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;[^}]*\}/
    );
  });

  it("왕관을 작게 유지하고 모바일에서 동아리명 옆 한 줄에 배치한다", () => {
    expect(css).toMatch(
      /\.national-ranking-honors\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honor-trigger\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;[^}]*\}/
    );
    expect(css).toMatch(
      /\.national-ranking-honor-trigger img\s*\{[^}]*width:\s*21px;[^}]*height:\s*16px;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-club-cell\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);[^}]*grid-template-rows:\s*auto auto;[^}]*\}/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-club-name\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*2;[^}]*\}[\s\S]*?\.national-ranking-honors\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*2;[^}]*\}/
    );
  });

  it("640px 이하에서 표 열을 압축한다", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-ranking-rank-column\s*\{[^}]*width:\s*48px;[^}]*\}[\s\S]*?\.national-ranking-score-column\s*\{[^}]*width:\s*96px;[^}]*\}/
    );
  });

  it("모바일 동아리 성적 목록은 화면 안의 세 열로 압축하고 긴 팀명을 줄바꿈한다", () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.national-club-results-list li\s*\{[^}]*grid-template-columns:\s*64px minmax\(0,\s*1fr\) 54px;[^}]*gap:\s*10px;[^}]*\}/
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
