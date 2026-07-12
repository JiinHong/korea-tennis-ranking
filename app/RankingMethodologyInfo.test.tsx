import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RankingMethodologyInfo from "./RankingMethodologyInfo";

describe("RankingMethodologyInfo", () => {
  it("아이콘 버튼으로 승인된 랭킹 산정 요약과 상세 링크를 연다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByRole("button", { name: "랭킹 산정 방식 보기" });

    expect(trigger.getAttribute("title")).toBe("랭킹 산정 방식 보기");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByText(
        "대회 성적에 진출 단계, 참가 규모, 대회 범위, 최근 연도 가중치를 적용합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        "같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        "WEMIX OPEN 2025는 전체 대진 검증 전이라 현재 점수에서 제외합니다."
      )
    ).toBeDefined();
    const detailLink = screen.getByRole("link", { name: "계산식 자세히 보기" });
    expect(detailLink.getAttribute("href")).toBe("/methodology");
  });

  it("Escape와 닫기 아이콘으로 다이얼로그를 닫는다", () => {
    render(<RankingMethodologyInfo />);

    const trigger = screen.getByRole("button", { name: "랭킹 산정 방식 보기" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const closeButton = screen.getByRole("button", { name: "닫기" });
    expect(closeButton.getAttribute("title")).toBe("닫기");
    fireEvent.click(closeButton);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Tab과 Shift+Tab 포커스를 닫기 버튼과 상세 링크 안에서 순환한다", () => {
    render(<RankingMethodologyInfo />);

    fireEvent.click(screen.getByRole("button", { name: "랭킹 산정 방식 보기" }));

    const closeButton = screen.getByRole("button", { name: "닫기" });
    const detailLink = screen.getByRole("link", { name: "계산식 자세히 보기" });

    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: "Tab" });
    expect(document.activeElement).toBe(detailLink);

    fireEvent.keyDown(detailLink, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(detailLink);

    fireEvent.keyDown(detailLink, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
  });

  it("바깥 배경을 누르면 다이얼로그를 닫는다", () => {
    render(<RankingMethodologyInfo />);

    fireEvent.click(screen.getByRole("button", { name: "랭킹 산정 방식 보기" }));
    fireEvent.click(screen.getByTestId("ranking-methodology-backdrop"));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("다이얼로그가 열린 동안 본문 스크롤을 잠그고 닫히거나 언마운트되면 이전 상태를 복원한다", () => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";

    try {
      const { unmount } = render(<RankingMethodologyInfo />);
      const trigger = screen.getByRole("button", {
        name: "랭킹 산정 방식 보기",
      });

      fireEvent.click(trigger);
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      expect(document.body.style.overflow).toBe("clip");

      fireEvent.click(trigger);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("clip");
    } finally {
      document.body.style.overflow = previousOverflow;
    }
  });
});
