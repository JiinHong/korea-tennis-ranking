import { describe, expect, it } from "vitest";

import type { AdminSeasonPlayer } from "./supabaseAdminPlayers";
import { buildAdminRankAdjustmentPreview } from "./adminRankAdjustment";

function player(
  rank: number,
  status: AdminSeasonPlayer["status"] = "active"
): AdminSeasonPlayer {
  return {
    seasonPlayerId: `sp-${rank}`,
    playerId: `player-${rank}`,
    name: `${rank}위 선수`,
    initialRank: rank,
    currentRank: rank,
    note: "",
    status,
    joinedAt: "2026-07-01T00:00:00Z",
    leftAt: status === "left" ? "2026-07-10T00:00:00Z" : null,
  };
}

const roster = [player(3), player(1), player(5), player(2), player(4), player(6, "left")];

describe("buildAdminRankAdjustmentPreview", () => {
  it("moves a player upward and shifts the intervening players down", () => {
    expect(buildAdminRankAdjustmentPreview(roster, "sp-5", 2)).toEqual({
      seasonPlayerId: "sp-5",
      playerName: "5위 선수",
      oldRank: 5,
      targetRank: 2,
      changes: [
        {
          seasonPlayerId: "sp-5",
          name: "5위 선수",
          oldRank: 5,
          newRank: 2,
        },
        {
          seasonPlayerId: "sp-2",
          name: "2위 선수",
          oldRank: 2,
          newRank: 3,
        },
        {
          seasonPlayerId: "sp-3",
          name: "3위 선수",
          oldRank: 3,
          newRank: 4,
        },
        {
          seasonPlayerId: "sp-4",
          name: "4위 선수",
          oldRank: 4,
          newRank: 5,
        },
      ],
    });
  });

  it("moves a player downward and shifts the intervening players up", () => {
    expect(buildAdminRankAdjustmentPreview(roster, "sp-2", 5)?.changes).toEqual([
      {
        seasonPlayerId: "sp-2",
        name: "2위 선수",
        oldRank: 2,
        newRank: 5,
      },
      {
        seasonPlayerId: "sp-3",
        name: "3위 선수",
        oldRank: 3,
        newRank: 2,
      },
      {
        seasonPlayerId: "sp-4",
        name: "4위 선수",
        oldRank: 4,
        newRank: 3,
      },
      {
        seasonPlayerId: "sp-5",
        name: "5위 선수",
        oldRank: 5,
        newRank: 4,
      },
    ]);
  });

  it("returns null when the target rank is unchanged", () => {
    expect(buildAdminRankAdjustmentPreview(roster, "sp-3", 3)).toBeNull();
  });

  it("returns null for a missing or left player", () => {
    expect(buildAdminRankAdjustmentPreview(roster, "missing", 2)).toBeNull();
    expect(buildAdminRankAdjustmentPreview(roster, "sp-6", 2)).toBeNull();
  });

  it("limits target ranks to the non-left roster", () => {
    expect(buildAdminRankAdjustmentPreview(roster, "sp-2", 0)).toBeNull();
    expect(buildAdminRankAdjustmentPreview(roster, "sp-2", 6)).toBeNull();
    expect(buildAdminRankAdjustmentPreview(roster, "sp-2", 2.5)).toBeNull();
  });
});
