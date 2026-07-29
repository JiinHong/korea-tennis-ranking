import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ClubRulesPage from "./page";

async function renderRulesPage(club: "seoultech" | "petc") {
  render(
    await ClubRulesPage({
      params: Promise.resolve({ club }),
    })
  );
}

describe("ClubRulesPage", () => {
  it("실제 시스템과 일치하는 핵심 운영 규칙을 안내한다", async () => {
    await renderRulesPage("seoultech");

    expect(
      screen.getByRole("heading", { name: "단식 랭킹 운영 규칙", level: 1 })
    ).toBeDefined();
    const challengeSection = screen.getByRole("region", {
      name: "도전 상대와 순위 변동",
    });

    expect(
      within(challengeSection).getByText(
        /활동 중인 선수 기준으로 본인보다 위 4명까지 도전할 수 있습니다/
      )
    ).toBeDefined();
    expect(
      within(challengeSection).getByText(
        /부상 선수는 도전 가능 범위를 계산할 때 건너뜁니다/
      )
    ).toBeDefined();
    const matchSection = screen.getByRole("region", {
      name: "경기 방식과 결과 보고",
    });
    expect(
      within(matchSection).getByText(
        /동일한 상대와 다시 경기하려면 이전 경기일로부터 14일/
      )
    ).toBeDefined();
    expect(
      within(matchSection).getByText(/5:5.*노애드 타이브레이크/)
    ).toBeDefined();

    const penaltySection = screen.getByRole("region", {
      name: "월간 미참여 정산",
    });
    expect(
      within(penaltySection).getByText(
        /한 달 동안 확정된 경기가 0경기인 선수는 다음 달 정산에서 2계단/
      )
    ).toBeDefined();
    expect(
      within(penaltySection).getByText(/부상 중이어도 월간 미참여 강등 대상/)
    ).toBeDefined();

    const injurySection = screen.getByRole("region", {
      name: "부상 상태",
    });
    expect(
      within(injurySection).getByText(/부상 상태에는 종료일을 미리 정하지 않습니다/)
    ).toBeDefined();
    expect(
      within(injurySection).getByText(
        /경기에 복귀하려면 관리자에게 부상 종료를 알리고/
      )
    ).toBeDefined();

    expect(screen.queryByText(/최대 2번/)).toBeNull();
    expect(screen.queryByText(/말일.*7일 전/)).toBeNull();
    expect(screen.queryByText(/미참여 페널티.*면제/)).toBeNull();
  });

  it("서울과기대 시즌 3 시작 기준과 시즌 2 기록을 함께 제공한다", async () => {
    await renderRulesPage("seoultech");

    const seasonSection = screen.getByRole("region", {
      name: "시즌 3 시작 기준과 지난 시즌",
    });

    expect(within(seasonSection).getByText(/37명의 선수/)).toBeDefined();
    expect(within(seasonSection).getByText(/152경기/)).toBeDefined();
    expect(within(seasonSection).getByText(/신규 선수는 가나다순/)).toBeDefined();
    expect(
      screen.getByRole("link", { name: "랭킹으로 돌아가기" }).getAttribute("href")
    ).toBe("/seoultech");
  });

  it("PETC에서는 공통 운영 규칙만 보여주고 서울과기대 기록은 노출하지 않는다", async () => {
    await renderRulesPage("petc");

    expect(screen.getByText("고려대학교 체육교육과 PETC")).toBeDefined();
    expect(screen.queryByText("고려대학교 체육교육과 PETC · 현재")).toBeNull();
    expect(screen.queryByText(/37명의 선수/)).toBeNull();
    expect(screen.queryByText(/152경기/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "랭킹으로 돌아가기" }).getAttribute("href")
    ).toBe("/petc");
  });
});
