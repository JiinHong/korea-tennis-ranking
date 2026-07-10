import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getAdminPlayerClubs,
  type SupabaseAdminPlayersAdapter,
} from "./supabaseAdminPlayers";

function createAdapter(): SupabaseAdminPlayersAdapter {
  return {
    listActiveClubs: vi.fn().mockResolvedValue([
      { id: "club-seoultech", slug: "seoultech", name: "서울과기대", title: "단식 랭킹" },
      { id: "club-empty", slug: "empty", name: "신규 동아리", title: "단식 랭킹" },
    ]),
    listCurrentSeasons: vi.fn().mockResolvedValue([
      {
        id: "season-3",
        clubId: "club-seoultech",
        name: "시즌3",
      },
    ]),
    listSeasonPlayers: vi.fn().mockResolvedValue([
      {
        seasonId: "season-3",
        seasonPlayerId: "sp-left",
        playerId: "player-left",
        name: "탈퇴선수",
        initialRank: 4,
        currentRank: 4,
        note: "",
        status: "left",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: "2026-07-09T00:00:00Z",
      },
      {
        seasonId: "season-3",
        seasonPlayerId: "sp-active",
        playerId: "player-active",
        name: "활동선수",
        initialRank: 1,
        currentRank: 1,
        note: "",
        status: "active",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: null,
      },
      {
        seasonId: "season-3",
        seasonPlayerId: "sp-injured",
        playerId: "player-injured",
        name: "부상선수",
        initialRank: 2,
        currentRank: 2,
        note: "손목",
        status: "injured",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: null,
      },
      {
        seasonId: "season-3",
        seasonPlayerId: "sp-inactive",
        playerId: "player-inactive",
        name: "휴식선수",
        initialRank: 3,
        currentRank: 3,
        note: "",
        status: "inactive",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: null,
      },
    ]),
  };
}

describe("getAdminPlayerClubs", () => {
  it("returns every current-season player ordered by current rank", async () => {
    const result = await getAdminPlayerClubs(createAdapter());
    const seoultech = result.find((club) => club.slug === "seoultech");

    expect(seoultech).toMatchObject({
      season: { id: "season-3", name: "시즌3" },
    });
    expect(seoultech?.players.map((player) => [player.name, player.status])).toEqual([
      ["활동선수", "active"],
      ["부상선수", "injured"],
      ["휴식선수", "inactive"],
      ["탈퇴선수", "left"],
    ]);
  });

  it("keeps active clubs that do not have a current season", async () => {
    const adapter = createAdapter();
    const result = await getAdminPlayerClubs(adapter);

    expect(result.find((club) => club.slug === "empty")).toMatchObject({
      season: null,
      players: [],
    });
    expect(adapter.listSeasonPlayers).toHaveBeenCalledWith(["season-3"]);
  });

  it("does not query season players when no club has a current season", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.listCurrentSeasons).mockResolvedValue([]);

    await getAdminPlayerClubs(adapter);

    expect(adapter.listSeasonPlayers).not.toHaveBeenCalled();
  });
});
