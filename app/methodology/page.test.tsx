import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MethodologyPage from "./page";

const SECTION_HEADINGS = [
  "지표 정의",
  "공식",
  "진출 단계 점수",
  "대회 위상 가중치",
  "참가 규모 가중치",
  "연도 가중치",
  "A/B/C팀 처리",
  "수상 기록",
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
      screen.getByText(
        "공개된 단체전 성적을 어떤 기준으로 점수화하는지 설명합니다."
      )
    ).toBeDefined();
    expect(screen.queryByText(/누구나 결과를 다시 계산/)).toBeNull();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual(SECTION_HEADINGS);
    expect(
      screen.getByText(
        "대회 점수 = 진출 단계 단위 × 대회 위상 단위 × 참가 규모 단위 × 최신 대회 단위"
      )
    ).toBeDefined();
    expect(screen.getByText("national-club-v3")).toBeDefined();
    expect(screen.getByText("2026-07-13")).toBeDefined();
  });

  it("공식 v3의 단계 단위와 대회별 위상 단위를 정수로 공개한다", () => {
    render(<MethodologyPage />);

    [
      ["우승", "21"],
      ["준우승", "13"],
      ["4강", "8"],
      ["8강", "5"],
      ["16강", "3"],
      ["32강", "2"],
      ["64강", "1"],
      ["실제로 치른 첫 경기 패배", "0"],
    ].forEach((cells) => expectRow("진출 단계별 점수", cells));

    [
      ["국토정중앙배(양구)", "1등급", "3"],
      ["경인지구 연맹전", "2등급", "2"],
      ["춘천소양강배", "2등급", "2"],
      ["WEMIX OPEN", "3등급", "1"],
      ["하늘내린인제", "3등급", "1"],
    ].forEach((cells) => expectRow("대회 위상별 가중치", cells));

    const prestigeTable = screen.getByRole("table", {
      name: "대회 위상별 가중치",
    });
    expect(within(prestigeTable).getByRole("columnheader", { name: "등급" }))
      .toBeDefined();
    expect(within(prestigeTable).queryByText("주요")).toBeNull();
    expect(within(prestigeTable).queryByText("신흥")).toBeNull();
  });

  it("참가 규모와 연도 가중치 기준값을 표로 공개한다", () => {
    render(<MethodologyPage />);

    [
      ["1~12팀", "1"],
      ["13~31팀", "2"],
      ["32~63팀", "3"],
      ["64팀 이상", "4"],
    ].forEach((cells) => expectRow("참가 팀 수별 기준 가중치", cells));

    [
      ["최신 대회", "3"],
      ["직전 대회", "2"],
      ["두 번째 이전 대회", "1"],
      ["그보다 오래된 대회", "0"],
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
    expect(
      screen.getByText(
        "랭킹표의 왕관은 2025년 대회 우승·준우승·4강 기록만 표시합니다. 원자료의 이전 수상 기록은 삭제하지 않고 보존합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        "금색 왕관은 우승, 은색 왕관은 준우승, 동색 왕관은 4강 진출을 뜻합니다. 이전 연도의 수상 기록은 삭제하지 않고 원자료에 유지합니다."
      )
    ).toBeDefined();
    expect(screen.queryByText(/오래된 왕관/)).toBeNull();
    expect(screen.getByText(/= 756점$/)).toBeDefined();
    expect(screen.getByText(/= 504점$/)).toBeDefined();
    expect(screen.getByText(/= 156점$/)).toBeDefined();
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
    expect(
      screen.getByText(
        "WEMIX OPEN 2025는 확인된 남자부·여자부 대진과 참가 규모를 현재 공개 점수에 반영합니다."
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
