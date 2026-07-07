import { describe, expect, it, vi } from "vitest";

import { getRankingDataForClub } from "@/lib/rankingData";

import { GET } from "./route";

vi.mock("@/lib/rankingData", () => ({
  getRankingDataForClub: vi.fn(),
}));

describe("GET /api/clubs/[club]/ranking", () => {
  it("등록된 동아리 slug이면 랭킹 데이터를 반환한다", async () => {
    vi.mocked(getRankingDataForClub).mockResolvedValue({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-logo.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
      },
      players: [
        {
          rank: 1,
          name: "오준석",
          note: "",
          wins: 0,
          losses: 0,
          matches: 0,
          recent5: [],
        },
      ],
      matches: [],
      detailsByPlayer: {
        오준석: {
          name: "오준석",
          rank: 1,
          note: "",
          wins: 1,
          losses: 0,
          matches: 1,
          winRate: 100,
          challengerRecord: {
            wins: 0,
            losses: 0,
            matches: 0,
          },
          defenderRecord: {
            wins: 1,
            losses: 0,
            matches: 1,
          },
          seasonRecords: [
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
              wins: 1,
              losses: 0,
              matches: 1,
              winRate: 100,
              latestDate: "2025. 12. 18",
              latestScore: "6:1",
              latestResult: "W",
            },
          ],
          recentMatches: [
            {
              date: "2025. 12. 18",
              season: "시즌1",
              opponent: "김도훈",
              result: "W",
              score: "6:1",
              role: "방어자",
              defenseResult: "방어 성공",
            },
          ],
        },
      },
    });

    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ club: "seoultech" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
      },
      players: [
        {
          rank: 1,
          name: "오준석",
          note: "",
          wins: 0,
          losses: 0,
          matches: 0,
          recent5: [],
        },
      ],
      detailsByPlayer: {
        오준석: {
          name: "오준석",
          rank: 1,
          note: "",
          wins: 1,
          losses: 0,
          matches: 1,
          winRate: 100,
          challengerRecord: {
            wins: 0,
            losses: 0,
            matches: 0,
          },
          defenderRecord: {
            wins: 1,
            losses: 0,
            matches: 1,
          },
          seasonRecords: [
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
              wins: 1,
              losses: 0,
              matches: 1,
              winRate: 100,
              latestDate: "2025. 12. 18",
              latestScore: "6:1",
              latestResult: "W",
            },
          ],
          recentMatches: [
            {
              date: "2025. 12. 18",
              season: "시즌1",
              opponent: "김도훈",
              result: "W",
              score: "6:1",
              role: "방어자",
              defenseResult: "방어 성공",
            },
          ],
        },
      },
    });
  });

  it("등록되지 않은 동아리 slug이면 404를 반환한다", async () => {
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ club: "unknown" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      message: "등록되지 않은 동아리입니다.",
    });
  });
});
