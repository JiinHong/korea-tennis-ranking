import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getAdminMatchClubs,
  type SupabaseAdminMatchesAdapter,
} from "./supabaseAdminMatches";

function createAdapter(): SupabaseAdminMatchesAdapter {
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
      { id: "season-3", clubId: "club-seoultech", name: "시즌3" },
    ]),
    listSeasonPlayers: vi.fn().mockResolvedValue([
      {
        seasonId: "season-3",
        playerId: "player-1",
        name: "오준석",
        currentRank: 1,
        status: "active",
      },
      {
        seasonId: "season-3",
        playerId: "player-2",
        name: "김도훈",
        currentRank: 2,
        status: "active",
      },
    ]),
    listSeasonMatches: vi.fn().mockResolvedValue([
      {
        id: "match-1",
        seasonId: "season-3",
        playedOn: "2026-07-08",
        sequenceNo: 12,
        challengerPlayerId: "player-2",
        challengerName: "김도훈",
        challengerRankBefore: 2,
        defenderPlayerId: "player-1",
        defenderName: "오준석",
        defenderRankBefore: 1,
        winnerPlayerId: "player-1",
        winnerName: "오준석",
        winnerScore: 6,
        loserScore: 4,
        defenseResult: "방어 성공",
        source: "import",
        status: "confirmed",
        updatedAt: "2026-07-10T00:00:00Z",
      },
      {
        id: "match-2",
        seasonId: "season-3",
        playedOn: "2026-07-07",
        sequenceNo: 11,
        challengerPlayerId: "player-2",
        challengerName: "김도훈",
        challengerRankBefore: 2,
        defenderPlayerId: "player-1",
        defenderName: "오준석",
        defenderRankBefore: 1,
        winnerPlayerId: "player-2",
        winnerName: "김도훈",
        winnerScore: 6,
        loserScore: 3,
        defenseResult: "방어 실패",
        source: "public_form",
        status: "voided",
        updatedAt: "2026-07-10T01:00:00Z",
      },
    ]),
  };
}

describe("getAdminMatchClubs", () => {
  it("groups current-season players and every match status by club", async () => {
    const adapter = createAdapter();

    const clubs = await getAdminMatchClubs(adapter);

    expect(clubs[0]).toMatchObject({
      slug: "seoultech",
      season: { id: "season-3", name: "시즌3" },
      players: [
        { playerId: "player-1", name: "오준석", currentRank: 1 },
        { playerId: "player-2", name: "김도훈", currentRank: 2 },
      ],
      matches: [
        { id: "match-1", status: "confirmed", sequenceNo: 12 },
        { id: "match-2", status: "voided", sequenceNo: 11 },
      ],
    });
    expect(clubs[1]).toMatchObject({
      slug: "empty",
      season: null,
      players: [],
      matches: [],
    });
  });

  it("does not query season data when no club has a current season", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.listCurrentSeasons).mockResolvedValue([]);

    await getAdminMatchClubs(adapter);

    expect(adapter.listSeasonPlayers).not.toHaveBeenCalled();
    expect(adapter.listSeasonMatches).not.toHaveBeenCalled();
  });
});
