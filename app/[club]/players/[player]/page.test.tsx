import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getClubConfig } from "@/lib/clubs";
import { getRankingDataForClub } from "@/lib/rankingData";

import PlayerPage from "./page";

vi.mock("@/lib/clubs", () => ({
  getClubConfig: vi.fn(),
}));

vi.mock("@/lib/rankingData", () => ({
  getRankingDataForClub: vi.fn(),
}));

const club = {
  slug: "seoultech",
  title: "서울과학기술대학교 테니스 단식 랭킹",
  titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
  organization: "서울과학기술대학교 테니스",
  subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
  logoPath: "/seoultech-symbol.png",
  logoAlt: "서울과학기술대학교 로고",
  sheetIdEnv: "GOOGLE_SHEET_ID",
  apiPath: "/api/clubs/seoultech/ranking",
  historicalMatchLogRange: "'시즌1~2 기록'!A1:J1000",
};

const detail = {
  name: "오준석",
  rank: 1,
  note: "",
  wins: 2,
  losses: 1,
  matches: 3,
  winRate: 67,
  challengerRecord: {
    wins: 1,
    losses: 0,
    matches: 1,
  },
  defenderRecord: {
    wins: 1,
    losses: 1,
    matches: 2,
  },
  seasonRecords: [
    {
      season: "시즌3",
      wins: 1,
      losses: 1,
      matches: 2,
      winRate: 50,
    },
    {
      season: "시즌1",
      wins: 1,
      losses: 0,
      matches: 1,
      winRate: 100,
    },
  ],
  opponentRecords: [
    {
      opponent: "김도훈",
      wins: 2,
      losses: 1,
      matches: 3,
      winRate: 67,
      latestDate: "2026. 7. 2",
      latestScore: "6:2",
      latestResult: "W",
    },
  ],
  recentMatches: [
    {
      date: "2026. 7. 2",
      season: "시즌3",
      opponent: "김도훈",
      result: "W",
      score: "6:2",
      role: "방어자",
      defenseResult: "방어 성공",
    },
  ],
};

describe("PlayerPage", () => {
  it("선수 상세 전적을 별도 페이지에서 보여주고 랭킹으로 돌아갈 수 있다", async () => {
    vi.mocked(getClubConfig).mockReturnValue(club);
    vi.mocked(getRankingDataForClub).mockResolvedValue({
      club,
      players: [],
      matches: [],
      detailsByPlayer: {
        오준석: detail,
      },
    });

    const ui = await PlayerPage({
      params: Promise.resolve({
        club: "seoultech",
        player: encodeURIComponent("오준석"),
      }),
    });

    const { container } = render(ui);

    const backLink = screen.getByRole("link", {
      name: "랭킹으로 돌아가기",
    });

    expect(backLink.getAttribute("href")).toBe("/seoultech");
    expect(
      screen.getByRole("region", { name: "오준석 상세 전적" })
    ).toBeDefined();
    expect(container.querySelector(".brand-title-row")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "오준석" })).toBeDefined();
    expect(screen.getByText(/통산 2승 1패/)).toBeDefined();
    expect(container.querySelector(".player-profile-header")).not.toBeNull();
    expect(container.querySelector(".detail-stat-strip")).not.toBeNull();
    expect(container.querySelectorAll(".detail-stat-item")).toHaveLength(4);
    expect(screen.getByText("시즌1")).toBeDefined();
    expect(screen.getAllByText("김도훈").length).toBeGreaterThan(0);
    expect(container.querySelector(".result-pill.is-win")).not.toBeNull();
    expect(container.querySelector(".result-badge")).toBeNull();
  });
});
