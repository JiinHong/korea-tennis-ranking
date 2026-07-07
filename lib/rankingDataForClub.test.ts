import { beforeEach, describe, expect, it, vi } from "vitest";

import { getClubConfig } from "@/lib/clubs";
import { getMatchLogTable } from "@/lib/matchLogTable";
import { getRankingDataForClub } from "@/lib/rankingData";
import { getRankingTable } from "@/lib/rankingTable";

vi.mock("@/lib/rankingTable", () => ({
  getRankingTable: vi.fn(),
}));

vi.mock("@/lib/matchLogTable", () => ({
  getMatchLogTable: vi.fn(),
}));

describe("getRankingDataForClub", () => {
  beforeEach(() => {
    process.env.GOOGLE_SHEET_ID = "seoultech-sheet-id";
    vi.mocked(getRankingTable).mockReset();
    vi.mocked(getMatchLogTable).mockReset();
  });

  it("클럽 설정의 sheetIdEnv로 시트 ID를 읽고 랭킹 데이터를 만든다", async () => {
    const club = getClubConfig("seoultech");

    vi.mocked(getRankingTable).mockResolvedValue([
      { rank: 1, name: "오준석", note: "" },
      { rank: 2, name: "김도훈", note: "" },
    ]);
    vi.mocked(getMatchLogTable).mockResolvedValue([
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
    ]);

    if (!club) {
      throw new Error("seoultech club config should exist");
    }

    const data = await getRankingDataForClub(club);

    expect(getRankingTable).toHaveBeenCalledWith("seoultech-sheet-id");
    expect(getMatchLogTable).toHaveBeenCalledWith("seoultech-sheet-id");
    expect(data.players).toEqual([
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 1,
        losses: 0,
        matches: 1,
        recent5: ["W"],
      },
    ]);
  });
});
