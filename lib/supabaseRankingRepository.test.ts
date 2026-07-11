import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabaseServer", () => ({
  getSupabaseReadClient: vi.fn(),
}));

import {
  getSupabaseMatchValidationContext,
  getSupabaseRankingTables,
  type SupabaseRankingAdapter,
} from "@/lib/supabaseRankingRepository";

function createAdapter(): SupabaseRankingAdapter {
  return {
    getClubBySlug: vi.fn().mockResolvedValue({
      id: "club-1",
      slug: "seoultech",
    }),
    getCurrentSeason: vi.fn().mockResolvedValue({
      id: "season-3",
      name: "시즌3",
    }),
    listSeasonPlayers: vi.fn().mockResolvedValue([
      {
        rank: 1,
        note: "",
        status: "active",
        player: { id: "p1", name: "오준석", displayName: "오준석" },
      },
      {
        rank: 2,
        note: "왼손잡이",
        status: "injured",
        player: { id: "p2", name: "김도훈", displayName: "김도훈" },
      },
    ]),
    listConfirmedMatches: vi.fn().mockResolvedValue([
      {
        seasonId: "season-3",
        seasonName: "시즌3",
        playedOn: "2026-07-08",
        challenger: { id: "p2", name: "김도훈", displayName: "김도훈" },
        defender: { id: "p1", name: "오준석", displayName: "오준석" },
        challengerRank: 2,
        defenderRank: 1,
        winner: { id: "p1", name: "오준석", displayName: "오준석" },
        winnerScore: 6,
        loserScore: 4,
        defenseResult: "방어 성공",
        source: "public_form",
      },
      {
        seasonId: "season-2",
        seasonName: "시즌2",
        playedOn: "2026-05-26",
        challenger: { id: "p2", name: "김도훈", displayName: "김도훈" },
        defender: { id: "p1", name: "오준석", displayName: "오준석" },
        challengerRank: 4,
        defenderRank: 1,
        winner: { id: "p2", name: "김도훈", displayName: "김도훈" },
        winnerScore: 6,
        loserScore: 5,
        defenseResult: "방어 실패",
        source: "import",
      },
    ]),
    getRuleConfig: vi.fn().mockResolvedValue({
      challengeRange: 4,
      rematchCooldownDays: 14,
      inactivityPenaltyDrop: 2,
    }),
  };
}

describe("getSupabaseRankingTables", () => {
  test("maps Supabase rows into current ranking, current matches, and historical matches", async () => {
    const adapter = createAdapter();

    const result = await getSupabaseRankingTables("seoultech", adapter);

    expect(adapter.getClubBySlug).toHaveBeenCalledWith("seoultech");
    expect(adapter.getCurrentSeason).toHaveBeenCalledWith("club-1");
    expect(adapter.listSeasonPlayers).toHaveBeenCalledWith("season-3");
    expect(adapter.listConfirmedMatches).toHaveBeenCalledWith("club-1");
    expect(result).toEqual({
      currentSeasonName: "시즌3",
      ranking: [
        { rank: 1, name: "오준석", note: "", status: "active" },
        { rank: 2, name: "김도훈", note: "왼손잡이", status: "injured" },
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
  });

  test("throws a clear error when the club is not found", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.getClubBySlug).mockResolvedValue(null);

    await expect(getSupabaseRankingTables("missing", adapter)).rejects.toThrow(
      "Supabase club not found: missing"
    );
  });

  test("throws a clear error when the current season is not found", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.getCurrentSeason).mockResolvedValue(null);

    await expect(getSupabaseRankingTables("seoultech", adapter)).rejects.toThrow(
      "Current season not found for club: seoultech"
    );
  });
});

describe("getSupabaseMatchValidationContext", () => {
  test("maps current season players, previous matches, and rule config for validation", async () => {
    const adapter = createAdapter();

    const result = await getSupabaseMatchValidationContext("seoultech", adapter);

    expect(adapter.getClubBySlug).toHaveBeenCalledWith("seoultech");
    expect(adapter.getCurrentSeason).toHaveBeenCalledWith("club-1");
    expect(adapter.listSeasonPlayers).toHaveBeenCalledWith("season-3");
    expect(adapter.listConfirmedMatches).toHaveBeenCalledWith("club-1");
    expect(adapter.getRuleConfig).toHaveBeenCalledWith("club-1", "season-3");
    expect(result).toEqual({
      players: [
        { id: "p1", name: "오준석", rank: 1, status: "active" },
        { id: "p2", name: "김도훈", rank: 2, status: "injured" },
      ],
      previousMatches: [
        { playerAId: "p2", playerBId: "p1", playedOn: "2026-07-08" },
      ],
      config: {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      },
    });
  });
});
