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
