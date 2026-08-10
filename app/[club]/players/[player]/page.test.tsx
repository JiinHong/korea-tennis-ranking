import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getClubConfig } from "@/lib/campusRanking/config";
import { getRankingDataForClub } from "@/lib/campusRanking/rankingData";

import PlayerPage from "./page";

const analytics = vi.hoisted(() => ({
  trackAmplitudeEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/campusRanking/config", () => ({
  getClubConfig: vi.fn(),
}));

vi.mock("@/lib/campusRanking/rankingData", () => ({
  getRankingDataForClub: vi.fn(),
}));

vi.mock("@/lib/analytics/amplitude", () => analytics);

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
    {
      date: "2026. 6. 30",
      season: "시즌3",
      opponent: "이도현",
      result: "L",
      score: "4:6",
      role: "도전자",
      defenseResult: "방어 성공",
    },
  ],
};

describe("PlayerPage", () => {
  it("PETC의 단색 로고를 구분한다", async () => {
    const petcClub = {
      ...club,
      slug: "petc",
      title: "고려대학교 체육교육과 PETC 테니스 단식 랭킹",
      organization: "고려대학교 체육교육과 PETC",
      logoPath: "/petc-logo.png",
      logoAlt: "고려대학교 체육교육과 PETC 로고",
    };
    vi.mocked(getClubConfig).mockReturnValue(petcClub);
    vi.mocked(getRankingDataForClub).mockResolvedValue({
      club: petcClub,
      players: [],
      matches: [],
      detailsByPlayer: {
        오준석: detail,
      },
    });

    const ui = await PlayerPage({
      params: Promise.resolve({
        club: "petc",
        player: encodeURIComponent("오준석"),
      }),
    });

    render(ui);

    expect(
      screen
        .getByRole("img", { name: "고려대학교 체육교육과 PETC 로고" })
        .classList.contains("is-monochrome")
    ).toBe(true);
  });

  it("선수 상세 전적을 별도 페이지에서 보여준다", async () => {
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

    const clubBackLink = screen.getByRole("link", {
      name: "서울과학기술대학교 테니스 단식 랭킹으로 돌아가기",
    });
    expect(clubBackLink.getAttribute("href")).toBe("/seoultech");
    expect(clubBackLink.closest(".summary-inner")).not.toBeNull();
    expect(clubBackLink.querySelector(".national-back-icon")).not.toBeNull();
    expect(
      screen.queryByRole("link", {
        name: "전국 대학 랭킹으로 돌아가기",
      })
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "랭킹으로 돌아가기" })
    ).toBeNull();
    expect(
      screen.getByRole("region", { name: "오준석 상세 전적" })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 1, name: "선수 상세" })
    ).toBeDefined();
    expect(screen.queryByText(club.title)).toBeNull();
    expect(container.querySelector(".brand-title-row")).not.toBeNull();
    expect(container.querySelector(".campus-kicker")).toBeNull();
    expect(screen.getByRole("heading", { name: "오준석" })).toBeDefined();
    expect(screen.getByText(/통산 2승 1패/)).toBeDefined();
    expect(container.querySelector(".player-profile-header")).not.toBeNull();
    expect(container.querySelector(".player-profile-record")).toBeNull();
    expect(container.querySelector(".detail-stat-strip")).not.toBeNull();
    expect(container.querySelectorAll(".detail-stat-item")).toHaveLength(4);
    expect(screen.getByText("시즌1")).toBeDefined();
    expect(screen.getAllByText("김도훈").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("승리")).toBeDefined();
    expect(screen.getByLabelText("패배")).toBeDefined();
    expect(screen.queryByText("W")).toBeNull();
    expect(screen.queryByText("L")).toBeNull();
    expect(
      container.querySelectorAll(".result-letter.match-outcome-icon")
    ).toHaveLength(2);
    expect(container.querySelector(".result-pill")).toBeNull();
    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Player Profile Viewed",
      {
        club_slug: "seoultech",
        rank: 1,
      }
    );
  });
});
