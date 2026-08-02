import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NationalRankingHonor from "./NationalRankingHonor";

describe("NationalRankingHonor", () => {
  it("우승 기록을 금색 왕관과 완전한 설명으로 보여준다", () => {
    render(
      <NationalRankingHonor
        honor={{
          editionKey: "wemix-2025-women",
          tournamentSlug: "wemix",
          tournamentName: "WEMIX OPEN",
          year: 2025,
          gender: "women",
          stage: "champion",
        }}
      />
    );

    const trigger = screen.getByRole("button", {
      name: "2025 위믹스 여자부 우승",
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByRole("img", { name: "우승" }).getAttribute("src")
    ).toContain(encodeURIComponent("/national-ranking/gold-crown.png"));
    expect(screen.getByText("2025 위믹스 여자부 우승")).toBeDefined();
  });

  it("준우승 기록에는 은색 왕관을 사용한다", () => {
    render(
      <NationalRankingHonor
        honor={{
          editionKey: "yanggu-2024-men",
          tournamentSlug: "yanggu",
          tournamentName: "국토정중앙배(양구)",
          year: 2024,
          gender: "men",
          stage: "runner_up",
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: "2024 양구 남자부 준우승" })
    ).toBeDefined();
    expect(
      screen.getByRole("img", { name: "준우승" }).getAttribute("src")
    ).toContain(encodeURIComponent("/national-ranking/silver-crown.png"));
  });

  it("4강 기록에는 동색 왕관과 4강 설명을 사용한다", () => {
    render(
      <NationalRankingHonor
        honor={{
          editionKey: "gyeongin-2025-men",
          tournamentSlug: "gyeongin",
          tournamentName: "경인지구 연맹전",
          year: 2025,
          gender: "men",
          stage: "semifinal",
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: "2025 경인지구 남자부 4강" })
    ).toBeDefined();
    expect(
      screen.getByRole("img", { name: "4강" }).getAttribute("src")
    ).toContain(encodeURIComponent("/national-ranking/bronze-crown.png"));
  });

  it("모바일 탭으로 열고 다시 탭하거나 바깥을 누르면 닫는다", () => {
    render(
      <NationalRankingHonor
        honor={{
          editionKey: "inje-2025-men",
          tournamentSlug: "inje",
          tournamentName: "하늘내린인제",
          year: 2025,
          gender: "men",
          stage: "champion",
        }}
      />
    );

    const trigger = screen.getByRole("button", {
      name: "2025 인제 남자부 우승",
    });
    const tooltip = screen.getByRole("tooltip");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(tooltip.getAttribute("data-open")).toBe("true");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("Escape로 닫으면 왕관 버튼에 포커스를 돌려준다", () => {
    render(
      <NationalRankingHonor
        honor={{
          editionKey: "chuncheon-2023-women",
          tournamentSlug: "chuncheon",
          tournamentName: "춘천소양강배",
          year: 2023,
          gender: "women",
          stage: "runner_up",
        }}
      />
    );

    const trigger = screen.getByRole("button", {
      name: "2023 춘천 여자부 준우승",
    });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
