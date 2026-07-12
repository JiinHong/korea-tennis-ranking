import type { AdminSeasonPlayer } from "./supabaseAdminPlayers";

export type AdminRankAdjustmentChange = {
  seasonPlayerId: string;
  name: string;
  oldRank: number;
  newRank: number;
};

export type AdminRankAdjustmentPreview = {
  seasonPlayerId: string;
  playerName: string;
  oldRank: number;
  targetRank: number;
  changes: AdminRankAdjustmentChange[];
};

export function buildAdminRankAdjustmentPreview(
  players: AdminSeasonPlayer[],
  seasonPlayerId: string,
  targetRank: number
): AdminRankAdjustmentPreview | null {
  const rankedPlayers = players
    .filter((player) => player.status !== "left")
    .toSorted((a, b) => a.currentRank - b.currentRank);
  const selectedPlayer = rankedPlayers.find(
    (player) => player.seasonPlayerId === seasonPlayerId
  );

  if (
    !selectedPlayer ||
    !Number.isInteger(targetRank) ||
    targetRank < 1 ||
    targetRank > rankedPlayers.length ||
    targetRank === selectedPlayer.currentRank
  ) {
    return null;
  }

  const movingUp = targetRank < selectedPlayer.currentRank;
  const shiftedPlayers = rankedPlayers.filter((player) =>
    movingUp
      ? player.currentRank >= targetRank &&
        player.currentRank < selectedPlayer.currentRank
      : player.currentRank > selectedPlayer.currentRank &&
        player.currentRank <= targetRank
  );
  const changes: AdminRankAdjustmentChange[] = [
    {
      seasonPlayerId: selectedPlayer.seasonPlayerId,
      name: selectedPlayer.name,
      oldRank: selectedPlayer.currentRank,
      newRank: targetRank,
    },
    ...shiftedPlayers.map((player) => ({
      seasonPlayerId: player.seasonPlayerId,
      name: player.name,
      oldRank: player.currentRank,
      newRank: player.currentRank + (movingUp ? 1 : -1),
    })),
  ];

  return {
    seasonPlayerId: selectedPlayer.seasonPlayerId,
    playerName: selectedPlayer.name,
    oldRank: selectedPlayer.currentRank,
    targetRank,
    changes,
  };
}
