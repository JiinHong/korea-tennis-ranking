import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClubConfig } from "@/lib/clubs";
import { getHistoricalMatchLogTable } from "@/lib/historicalMatchLogTable";
import { getMatchLogTable } from "@/lib/matchLogTable";
import { getRankingDataForClub } from "@/lib/rankingData";
import { getRankingTable } from "@/lib/rankingTable";
import { getSupabaseRankingTables } from "@/lib/supabaseRankingRepository";

vi.mock("@/lib/rankingTable", () => ({
  getRankingTable: vi.fn(),
}));

vi.mock("@/lib/matchLogTable", () => ({
  getMatchLogTable: vi.fn(),
}));

vi.mock("@/lib/historicalMatchLogTable", () => ({
  getHistoricalMatchLogTable: vi.fn(),
}));

vi.mock("@/lib/supabaseRankingRepository", () => ({
  getSupabaseRankingTables: vi.fn(),
}));

describe("getRankingDataForClub", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T12:00:00+09:00"));
    delete process.env.RANKING_DATA_SOURCE;
    process.env.GOOGLE_SHEET_ID = "seoultech-sheet-id";
    process.env.PETC_GOOGLE_SHEET_ID = "petc-sheet-id";
    vi.mocked(getRankingTable).mockReset();
    vi.mocked(getMatchLogTable).mockReset();
    vi.mocked(getHistoricalMatchLogTable).mockReset();
    vi.mocked(getSupabaseRankingTables).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("클럽 설정의 sheetIdEnv로 시트 ID를 읽고 랭킹 데이터와 상세 전적을 만든다", async () => {
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
      {
        date: "2026. 6. 1",
        challenger: "김도훈",
        challengerRank: 2,
        defender: "오준석",
        defenderRank: 1,
        winner: "오준석",
        score: "6:2",
        defenseResult: "방어 성공",
      },
    ]);
    vi.mocked(getHistoricalMatchLogTable).mockResolvedValue([
      {
        date: "2025. 12. 18",
        challenger: "김도훈",
        challengerRank: 4,
        defender: "오준석",
        defenderRank: 2,
        winner: "오준석",
        score: "6:1",
        defenseResult: "방어 성공",
        season: "시즌1",
        sourceNote: "카톡 OCR",
      },
    ]);

    if (!club) {
      throw new Error("seoultech club config should exist");
    }

    const data = await getRankingDataForClub(club);

    expect(getRankingTable).toHaveBeenCalledWith("seoultech-sheet-id");
    expect(getMatchLogTable).toHaveBeenCalledWith("seoultech-sheet-id");
    expect(getHistoricalMatchLogTable).toHaveBeenCalledWith(
      "seoultech-sheet-id",
      "'시즌1~2 기록'!A1:J1000"
    );
    expect(data.players).toEqual([
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 1,
        losses: 1,
        matches: 2,
        recent5: ["L", "W"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 1,
        losses: 1,
        matches: 2,
        recent5: ["W", "L"],
      },
    ]);
    expect(data.summary).toEqual({
      totalMatches: 2,
      recent30Matches: 1,
    });
    expect(data.detailsByPlayer["오준석"]).toMatchObject({
      name: "오준석",
      wins: 2,
      losses: 1,
      matches: 3,
      seasonRecords: [
        { season: "시즌3", wins: 1, losses: 1, matches: 2, winRate: 50 },
        { season: "시즌1", wins: 1, losses: 0, matches: 1, winRate: 100 },
      ],
      opponentRecords: [
        {
          opponent: "김도훈",
          wins: 2,
          losses: 1,
          matches: 3,
          latestDate: "2026. 7. 1",
        },
      ],
    });
  });

  it("과거 기록 범위가 없는 클럽은 시즌1~2 기록 탭을 읽지 않고 현재 기록만 반환한다", async () => {
    const club = getClubConfig("petc");

    vi.mocked(getRankingTable).mockResolvedValue([
      { rank: 1, name: "문준상", note: "" },
      { rank: 2, name: "박준형", note: "" },
    ]);
    vi.mocked(getMatchLogTable).mockResolvedValue([
      {
        date: "2026. 7. 8",
        challenger: "박준형",
        challengerRank: 2,
        defender: "문준상",
        defenderRank: 1,
        winner: "문준상",
        score: "6:3",
        defenseResult: "방어 성공",
      },
    ]);

    if (!club) {
      throw new Error("petc club config should exist");
    }

    const data = await getRankingDataForClub(club);

    expect(getRankingTable).toHaveBeenCalledWith("petc-sheet-id");
    expect(getMatchLogTable).toHaveBeenCalledWith("petc-sheet-id");
    expect(getHistoricalMatchLogTable).not.toHaveBeenCalled();
    expect(data.detailsByPlayer["문준상"]).toMatchObject({
      name: "문준상",
      wins: 1,
      losses: 0,
      matches: 1,
      seasonRecords: [
        { season: "현재", wins: 1, losses: 0, matches: 1, winRate: 100 },
      ],
    });
    expect(data.summary).toEqual({
      totalMatches: 1,
      recent30Matches: 1,
    });
  });

  it("RANKING_DATA_SOURCE가 supabase이면 시트 대신 Supabase repository에서 랭킹 원천 데이터를 읽는다", async () => {
    const club = getClubConfig("seoultech");
    process.env.RANKING_DATA_SOURCE = "supabase";

    vi.mocked(getSupabaseRankingTables).mockResolvedValue({
      currentSeasonName: "시즌4",
      ranking: [
        { rank: 1, name: "오준석", note: "" },
        { rank: 2, name: "김도훈", note: "" },
      ],
      matches: [
        {
          date: "2026. 7. 8",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "6:4",
          defenseResult: "방어 성공",
        },
      ],
      historicalMatches: [
        {
          date: "2026. 5. 26",
          challenger: "김도훈",
          challengerRank: 4,
          defender: "오준석",
          defenderRank: 1,
          winner: "김도훈",
          score: "6:5",
          defenseResult: "방어 실패",
          season: "시즌2",
          sourceNote: "import",
        },
      ],
    });

    if (!club) {
      throw new Error("seoultech club config should exist");
    }

    const data = await getRankingDataForClub(club);

    expect(getSupabaseRankingTables).toHaveBeenCalledWith("seoultech");
    expect(getRankingTable).not.toHaveBeenCalled();
    expect(getMatchLogTable).not.toHaveBeenCalled();
    expect(getHistoricalMatchLogTable).not.toHaveBeenCalled();
    expect(data.players).toEqual([
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 1,
        losses: 0,
        matches: 1,
        recent5: ["W"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
    ]);
    expect(data.detailsByPlayer["오준석"].seasonRecords).toEqual([
      { season: "시즌4", wins: 1, losses: 0, matches: 1, winRate: 100 },
      { season: "시즌2", wins: 0, losses: 1, matches: 1, winRate: 0 },
    ]);
  });
});
