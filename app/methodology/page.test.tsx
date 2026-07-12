import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MethodologyPage from "./page";

const SECTION_HEADINGS = [
  "지표 정의",
  "공식",
  "진출 단계 점수",
  "대회 범위 가중치",
  "참가 규모 가중치",
  "연도 가중치",
  "A/B/C팀 처리",
  "남자부·여자부·종합",
  "계산 예시",
  "데이터 검증 원칙",
  "버전과 시행일",
  "공식 참고 자료",
];

function expectRow(tableName: string, cells: string[]) {
  const table = screen.getByRole("table", { name: tableName });
  const row = within(table).getByRole("row", {
    name: cells.join(" "),
  });

  expect(row).toBeDefined();
}

describe("MethodologyPage", () => {
  it("승인된 순서의 공개 문서 구조와 전체 공식을 제공한다", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", { name: "랭킹 계산 방식", level: 1 })
    ).toBeDefined();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual(SECTION_HEADINGS);
    expect(
      screen.getByText(
        "대회 점수 = 진출 단계 점수 × 대회 범위 × 참가 규모 × 연도 가중치"
      )
    ).toBeDefined();
    expect(screen.getByText("national-club-v1")).toBeDefined();
    expect(screen.getByText("2026-07-12")).toBeDefined();
  });

  it("공식 v1의 단계 점수와 대회 범위 가중치를 표로 공개한다", () => {
    render(<MethodologyPage />);

    [
      ["우승", "100"],
      ["준우승", "65"],
      ["4강", "40"],
      ["8강", "20"],
      ["16강", "10"],
      ["32강", "5"],
      ["64강", "2.5"],
      ["실제로 치른 첫 경기 패배", "0"],
    ].forEach((cells) => expectRow("진출 단계별 점수", cells));

    [
      ["국토정중앙배(양구)", "전국", "1.00"],
      ["하늘내린인제", "전국", "1.00"],
      ["춘천소양강배", "전국", "1.00"],
      ["WEMIX OPEN", "전국", "1.00"],
      ["경인지구 연맹전", "지역", "0.85"],
    ].forEach((cells) => expectRow("대회 범위별 가중치", cells));
  });

  it("참가 규모와 연도 가중치 기준값을 표로 공개한다", () => {
    render(<MethodologyPage />);

    [
      ["16", "0.90"],
      ["32", "1.00"],
      ["64", "1.10"],
      ["128", "1.20"],
    ].forEach((cells) => expectRow("참가 팀 수별 기준 가중치", cells));

    [
      ["최신 연도", "1.00"],
      ["1년 전", "0.60"],
      ["2년 전", "0.36"],
      ["3년 이상", "0"],
    ].forEach((cells) => expectRow("대회별 연도 가중치", cells));
  });

  it("복수 팀과 부문별 집계 원칙 및 계산 예시를 설명한다", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByText(
        "같은 동아리가 같은 대회·연도·부문에 A/B/C팀으로 참가하면 가장 좋은 성적 한 팀만 점수에 반영합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        "남자부와 여자부 랭킹은 각각 독립된 주요 랭킹이며, 종합 랭킹은 남자부 점수와 여자부 점수를 더한 보조 랭킹입니다."
      )
    ).toBeDefined();
    expect(screen.getByText(/= 110점$/)).toBeDefined();
    expect(screen.getByText(/= 66점$/)).toBeDefined();
    expect(screen.getByText(/= 66\.3점$/)).toBeDefined();
  });

  it("총점이 같을 때 적용하는 동점 처리 순서를 공개한다", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", { name: "동점 처리", level: 3 })
    ).toBeDefined();
    expect(
      within(screen.getByRole("list", { name: "동점 처리 기준" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual([
      "최신 연도 대회에서 얻은 점수가 더 높은 동아리",
      "한 대회에서 얻은 최고 점수가 더 높은 동아리",
      "우승 횟수가 더 많은 동아리",
      "준우승 횟수가 더 많은 동아리",
      "동아리 표시 이름의 가나다순",
    ]);
  });

  it("검증 상태를 설명하되 미해결 원본 행은 공개하지 않는다", () => {
    render(<MethodologyPage />);

    expect(screen.getByText("verified")).toBeDefined();
    expect(screen.getByText("unresolved")).toBeDefined();
    expect(screen.getByText("missing")).toBeDefined();
    expect(screen.getByText("did_not_enter")).toBeDefined();
    expect(
      screen.getByText(
        "unresolved와 missing 결과는 점수에서 제외하며, 미해결 원본 행은 공개 페이지에 노출하지 않습니다."
      )
    ).toBeDefined();
  });

  it("안전한 외부 참고 링크와 전국 랭킹 복귀 링크를 제공한다", () => {
    render(<MethodologyPage />);

    const outboundLinks = [
      "ATP 랭킹 점수표",
      "BWF 세계 랭킹 시스템",
      "OWGR 랭킹 방식",
      "UEFA 클럽 랭킹",
      "WEMIX OPEN 2025 공식 대회 요강",
      "solved.ac 도움말 UX 참고",
    ].map((name) => screen.getByRole("link", { name }));

    outboundLinks.forEach((link) => {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")?.split(" ").sort()).toEqual([
        "noopener",
        "noreferrer",
      ]);
    });

    expect(
      screen
        .getByRole("link", { name: "전국 랭킹으로 돌아가기" })
        .getAttribute("href")
    ).toBe("/");
  });
});
