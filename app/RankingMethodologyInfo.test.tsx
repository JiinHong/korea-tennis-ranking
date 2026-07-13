import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RankingMethodologyInfo from "./RankingMethodologyInfo";

describe("RankingMethodologyInfo", () => {
  it("클릭 버튼이나 다이얼로그 없이 정보 아이콘과 산정 요약을 함께 렌더링한다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByLabelText("랭킹 산정 방식 안내");

    expect(trigger.tagName).toBe("SPAN");
    expect(trigger.getAttribute("tabindex")).toBe("0");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(
        "대회 성적에 진출 단계, 대회 위상, 참가 규모, 최근 연도 가중치를 적용합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText("같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.")
    ).toBeDefined();
    expect(
      screen.getByText(
        "WEMIX OPEN 2025는 전체 대진 검증 전이라 현재 점수에서 제외합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "자세히 보기" }).getAttribute("href")
    ).toBe("/methodology");
  });

  it("아이콘을 클릭해도 다이얼로그를 만들거나 본문 스크롤을 잠그지 않는다", () => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";

    try {
      render(<RankingMethodologyInfo />);

      fireEvent.click(screen.getByLabelText("랭킹 산정 방식 안내"));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByTestId("ranking-methodology-backdrop")).toBeNull();
      expect(document.body.style.overflow).toBe("clip");
    } finally {
      document.body.style.overflow = previousOverflow;
    }
  });
});
