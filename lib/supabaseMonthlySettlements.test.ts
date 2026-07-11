import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getAdminMonthlyClubs,
  type SupabaseMonthlySettlementsAdapter,
} from "./supabaseMonthlySettlements";

function createAdapter(): SupabaseMonthlySettlementsAdapter {
  return {
    listActiveClubs: vi.fn().mockResolvedValue([
      {
        id: "club-seoultech",
        slug: "seoultech",
        name: "서울과기대",
        title: "단식 랭킹",
      },
      {
        id: "club-empty",
        slug: "empty",
        name: "시즌 없는 동아리",
        title: "준비 중",
      },
    ]),
    listCurrentSeasons: vi.fn().mockResolvedValue([
      {
        id: "season-3",
        clubId: "club-seoultech",
        name: "시즌3",
        startsOn: "2026-07-01",
        endsOn: null,
      },
    ]),
    listSeasonPlayers: vi.fn().mockResolvedValue([
      {
        seasonId: "season-3",
        playerId: "p1",
        name: "오준석",
        initialRank: 1,
        currentRank: 1,
        status: "active",
      },
      {
        seasonId: "season-3",
        playerId: "p2",
        name: "김도훈",
        initialRank: 2,
        currentRank: 2,
        status: "injured",
      },
      {
        seasonId: "season-3",
        playerId: "p3",
        name: "박정용",
        initialRank: 3,
        currentRank: 3,
        status: "inactive",
      },
      {
        seasonId: "season-3",
        playerId: "p4",
        name: "탈퇴자",
        initialRank: 4,
        currentRank: 4,
        status: "left",
      },
    ]),
    listSeasonMatches: vi.fn().mockResolvedValue([
      {
        id: "m1",
        seasonId: "season-3",
        playedOn: "2026-07-10",
        sequenceNo: 1,
        player1Id: "p1",
        player2Id: "p4",
        winnerPlayerId: "p1",
        status: "confirmed",
      },
      {
        id: "m2",
        seasonId: "season-3",
        playedOn: "2026-07-11",
        sequenceNo: 2,
        player1Id: "p2",
        player2Id: "p3",
        winnerPlayerId: "p2",
        status: "voided",
      },
    ]),
    listSettlements: vi.fn().mockResolvedValue([]),
    listRuleConfigs: vi.fn().mockResolvedValue([
      { seasonId: "season-3", inactivityPenaltyDrop: 2 },
    ]),
  };
}

describe("getAdminMonthlyClubs", () => {
  it("builds previews only for completed in-season months", async () => {
    const clubs = await getAdminMonthlyClubs(createAdapter(), "2026-09-15");

    expect(clubs[0]).toMatchObject({
      slug: "seoultech",
      season: {
        id: "season-3",
        name: "시즌3",
        startsOn: "2026-07-01",
        endsOn: null,
      },
      penaltyDrop: 2,
    });
    expect(clubs[0].previews.map((preview) => preview.targetMonth)).toEqual([
      "2026-08",
      "2026-07",
    ]);
    expect(clubs[0].previews[1].targets.map((player) => player.playerId)).toEqual([
      "p2",
      "p3",
    ]);
    expect(
      clubs[0].previews[1].players.find((player) => player.playerId === "p1")
        ?.matchCount
    ).toBe(1);
    expect(
      clubs[0].previews[1].players.find((player) => player.playerId === "p4")
        ?.penalized
    ).toBe(false);
    expect(clubs[1]).toMatchObject({
      slug: "empty",
      season: null,
      previews: [],
    });
  });

  it("does not query season data when no club has a current season", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.listCurrentSeasons).mockResolvedValue([]);

    await getAdminMonthlyClubs(adapter, "2026-09-15");

    expect(adapter.listSeasonPlayers).not.toHaveBeenCalled();
    expect(adapter.listSeasonMatches).not.toHaveBeenCalled();
    expect(adapter.listSettlements).not.toHaveBeenCalled();
    expect(adapter.listRuleConfigs).not.toHaveBeenCalled();
  });
});
