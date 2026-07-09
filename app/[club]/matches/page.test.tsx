import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getClubConfig } from "@/lib/clubs";
import { getRankingDataForClub } from "@/lib/rankingData";

import MatchesPage from "./page";

vi.mock("@/lib/clubs", () => ({
  getClubConfig: vi.fn(),
  listClubConfigs: vi.fn(() => [
    {
      slug: "seoultech",
    },
  ]),
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

describe("MatchesPage", () => {
  it("동아리의 전체 경기 기록을 별도 페이지에서 보여준다", async () => {
    vi.mocked(getClubConfig).mockReturnValue(club);
    vi.mocked(getRankingDataForClub).mockResolvedValue({
      club,
      players: [],
      summary: {
        totalMatches: 2,
        recent30Matches: 2,
      },
      matches: [
        {
          date: "2026. 7. 1",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "김도훈",
          score: "6:4",
          defenseResult: "방어 실패",
        },
        {
          date: "2026. 7. 2",
          challenger: "박종건",
          challengerRank: 7,
          defender: "김선우",
          defenderRank: 8,
          winner: "김선우",
          score: "6:3",
          defenseResult: "방어 성공",
        },
      ],
      detailsByPlayer: {},
    });

    const ui = await MatchesPage({
      params: Promise.resolve({
        club: "seoultech",
      }),
    });

    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: "전체 경기" })
    ).toBeDefined();

    const matchSection = screen.getByRole("region", {
      name: "전체 경기 기록",
    });

    expect(within(matchSection).getAllByRole("listitem")).toHaveLength(2);
    expect(within(matchSection).getByText("박종건")).toBeDefined();
    expect(within(matchSection).getByText("김선우")).toBeDefined();
    expect(within(matchSection).getByText("김도훈")).toBeDefined();
    expect(within(matchSection).getByText("오준석")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "랭킹으로 돌아가기" }).getAttribute("href")
    ).toBe("/seoultech");
  });
});
