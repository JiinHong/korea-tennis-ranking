import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RankingMethodologyInfo from "./RankingMethodologyInfo";

describe("RankingMethodologyInfo", () => {
  it("정보 아이콘을 접근 가능한 토글 버튼으로 렌더링한다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByRole("button", {
      name: "랭킹 산정 방식 안내",
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe(
      "ranking-methodology-tooltip"
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("link", { name: "자세히 보기" }).getAttribute("href")
    ).toBe("/methodology");
    expect(
      screen.getByText(
        "진출 단계, 대회 위상, 참가 규모, 최신 대회 순서에 정수 단위를 적용합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        "우승과 준우승 왕관은 점수 산정 기간이 지나도 통산 기록으로 남습니다."
      )
    ).toBeDefined();
    expect(screen.queryByText(/현재 점수에서 제외/)).toBeNull();
  });

  it("모바일처럼 아이콘을 탭하면 안내를 열고 다시 탭하면 닫는다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByRole("button", {
      name: "랭킹 산정 방식 안내",
    });
    const tooltip = screen.getByTestId("ranking-methodology-tooltip");

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(tooltip.getAttribute("data-open")).toBe("true");

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(tooltip.getAttribute("data-open")).toBe("false");
  });

  it("열린 안내는 바깥 영역을 누르거나 Escape를 누르면 닫는다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByRole("button", {
      name: "랭킹 산정 방식 안내",
    });

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("안내를 열어도 모달을 만들거나 본문 스크롤을 잠그지 않는다", () => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";

    try {
      render(<RankingMethodologyInfo />);

      fireEvent.click(
        screen.getByRole("button", { name: "랭킹 산정 방식 안내" })
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByTestId("ranking-methodology-backdrop")).toBeNull();
      expect(document.body.style.overflow).toBe("clip");
    } finally {
      document.body.style.overflow = previousOverflow;
    }
  });
});
