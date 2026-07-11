import type { PlayerStatus } from "@/lib/rankingRules";

export type MonthlyPenaltyPlayer = {
  playerId: string;
  name: string;
  initialRank: number;
  currentRank: number;
  status: PlayerStatus;
  joinedAt?: string;
};

export type MonthlyPenaltyMatch = {
  id: string;
  playedOn: string;
  sequenceNo: number;
  player1Id: string;
  player2Id: string;
  winnerPlayerId: string;
  status: "confirmed" | "voided";
};

export type MonthlyPenaltySettlement = {
  id: string;
  targetMonth: string;
  penaltyDrop: number;
  targetPlayerIds: string[];
  eligiblePlayerIds?: string[];
  matchCounts?: Record<string, number>;
};

export type MonthlyPenaltyPreviewPlayer = MonthlyPenaltyPlayer & {
  eligible: boolean;
  expectedRank: number;
  matchCount: number;
  penalized: boolean;
  actualDrop: number;
};

export type MonthlyPenaltyPreview = {
  targetMonth: string;
  penaltyDrop: number;
  alreadyApplied: boolean;
  targets: MonthlyPenaltyPreviewPlayer[];
  players: MonthlyPenaltyPreviewPlayer[];
};

type RankedEntry = {
  playerId: string;
  currentRank: number;
};

function normalizeRanks<T extends RankedEntry>(players: T[]): T[] {
  return players.map((player, index) => ({
    ...player,
    currentRank: index + 1,
  }));
}

export function applyMonthlyPenalty<T extends RankedEntry>(
  players: T[],
  targetPlayerIds: string[],
  penaltyDrop: number,
  eligiblePlayerIds?: string[]
): T[] {
  const targetIds = new Set(targetPlayerIds);
  const result = players
    .slice()
    .sort((a, b) => a.currentRank - b.currentRank);
  const eligibleIds = new Set(
    eligiblePlayerIds ?? result.map((player) => player.playerId)
  );
  const targetsFromBottom = result
    .filter(
      (player) =>
        targetIds.has(player.playerId) && eligibleIds.has(player.playerId)
    )
    .reverse();

  for (const target of targetsFromBottom) {
    const targetIndex = result.findIndex(
      (player) => player.playerId === target.playerId
    );
    let destinationIndex = targetIndex;
    let yieldedPlaces = 0;

    for (
      let index = targetIndex + 1;
      index < result.length && yieldedPlaces < penaltyDrop;
      index += 1
    ) {
      if (
        eligibleIds.has(result[index].playerId) &&
        !targetIds.has(result[index].playerId)
      ) {
        destinationIndex = index;
        yieldedPlaces += 1;
      }
    }

    if (destinationIndex === targetIndex) continue;

    const [removed] = result.splice(targetIndex, 1);
    result.splice(destinationIndex, 0, removed);
  }

  return normalizeRanks(result);
}

function nextMonthStart(targetMonth: string): string {
  const [year, month] = targetMonth.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    throw new Error("정산 월은 YYYY-MM 형식이어야 합니다.");
  }

  const next = new Date(Date.UTC(year, month, 1));

  return next.toISOString().slice(0, 10);
}

function joinedBeforeMonthEnd(
  player: MonthlyPenaltyPlayer,
  monthEnd: string
): boolean {
  if (!player.joinedAt) return true;

  return (
    new Date(player.joinedAt).getTime() <
    new Date(`${monthEnd}T00:00:00+09:00`).getTime()
  );
}

function applyRankingMatch<T extends RankedEntry>(
  players: T[],
  match: MonthlyPenaltyMatch
): T[] {
  const player1Index = players.findIndex(
    (player) => player.playerId === match.player1Id
  );
  const player2Index = players.findIndex(
    (player) => player.playerId === match.player2Id
  );

  if (player1Index === -1 || player2Index === -1) return players;

  const challengerIndex = Math.max(player1Index, player2Index);
  const defenderIndex = Math.min(player1Index, player2Index);
  const challenger = players[challengerIndex];

  if (match.winnerPlayerId !== challenger.playerId) return players;

  const result = players.slice();
  const [promoted] = result.splice(challengerIndex, 1);
  result.splice(defenderIndex, 0, promoted);

  return normalizeRanks(result);
}

type ReplayEvent =
  | {
      type: "settlement";
      date: string;
      sequenceNo: number;
      settlement: MonthlyPenaltySettlement;
    }
  | {
      type: "match";
      date: string;
      sequenceNo: number;
      match: MonthlyPenaltyMatch;
    };

function replayRankings(
  players: MonthlyPenaltyPlayer[],
  matches: MonthlyPenaltyMatch[],
  settlements: MonthlyPenaltySettlement[]
): MonthlyPenaltyPlayer[] {
  let ranking = players
    .map((player) => ({ ...player, currentRank: player.initialRank }))
    .sort((a, b) => a.currentRank - b.currentRank);
  const events: ReplayEvent[] = [
    ...matches
      .filter((match) => match.status === "confirmed")
      .map((match) => ({
        type: "match" as const,
        date: match.playedOn,
        sequenceNo: match.sequenceNo,
        match,
      })),
    ...settlements.map((settlement) => ({
      type: "settlement" as const,
      date: nextMonthStart(settlement.targetMonth),
      sequenceNo: 0,
      settlement,
    })),
  ].sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);

    if (dateOrder !== 0) return dateOrder;
    if (a.type !== b.type) return a.type === "settlement" ? -1 : 1;

    return a.sequenceNo - b.sequenceNo;
  });

  for (const event of events) {
    ranking =
      event.type === "match"
        ? applyRankingMatch(ranking, event.match)
        : applyMonthlyPenalty(
            ranking,
            event.settlement.targetPlayerIds,
            event.settlement.penaltyDrop,
            event.settlement.eligiblePlayerIds
          );
  }

  return normalizeRanks([
    ...ranking.filter((player) => player.status !== "left"),
    ...ranking.filter((player) => player.status === "left"),
  ]);
}

export function buildMonthlyPenaltyPreview({
  targetMonth,
  penaltyDrop,
  players,
  matches,
  settlements,
}: {
  targetMonth: string;
  penaltyDrop: number;
  players: MonthlyPenaltyPlayer[];
  matches: MonthlyPenaltyMatch[];
  settlements: MonthlyPenaltySettlement[];
}): MonthlyPenaltyPreview {
  const monthStart = `${targetMonth}-01`;
  const monthEnd = nextMonthStart(targetMonth);
  const matchCountByPlayer = new Map<string, number>();

  for (const match of matches) {
    if (
      match.status !== "confirmed" ||
      match.playedOn < monthStart ||
      match.playedOn >= monthEnd
    ) {
      continue;
    }

    matchCountByPlayer.set(
      match.player1Id,
      (matchCountByPlayer.get(match.player1Id) ?? 0) + 1
    );
    matchCountByPlayer.set(
      match.player2Id,
      (matchCountByPlayer.get(match.player2Id) ?? 0) + 1
    );
  }

  const calculatedTargetPlayerIds = players
    .filter(
      (player) =>
        player.status !== "left" &&
        joinedBeforeMonthEnd(player, monthEnd) &&
        (matchCountByPlayer.get(player.playerId) ?? 0) === 0
    )
    .sort((a, b) => a.currentRank - b.currentRank)
    .map((player) => player.playerId);
  const calculatedEligiblePlayerIds = players
    .filter(
      (player) =>
        player.status !== "left" && joinedBeforeMonthEnd(player, monthEnd)
    )
    .map((player) => player.playerId);
  const appliedSettlement = settlements.find(
    (settlement) => settlement.targetMonth === targetMonth
  );
  const alreadyApplied = Boolean(appliedSettlement);
  const targetPlayerIds =
    appliedSettlement?.targetPlayerIds ?? calculatedTargetPlayerIds;
  const eligiblePlayerIds =
    appliedSettlement?.eligiblePlayerIds ?? calculatedEligiblePlayerIds;
  const effectiveMatchCountByPlayer = appliedSettlement?.matchCounts
    ? new Map(
        Object.entries(appliedSettlement.matchCounts).map(([playerId, count]) => [
          playerId,
          Number(count),
        ])
      )
    : matchCountByPlayer;
  const targetIds = new Set(targetPlayerIds);
  const eligibleIds = new Set(eligiblePlayerIds);
  const replaySettlements = alreadyApplied
    ? settlements
    : [
        ...settlements,
        {
          id: `preview-${targetMonth}`,
          targetMonth,
          penaltyDrop,
          targetPlayerIds,
          eligiblePlayerIds,
        },
      ];
  const replayedPlayers = replayRankings(players, matches, replaySettlements);
  const expectedRankByPlayer = new Map(
    replayedPlayers.map((player) => [player.playerId, player.currentRank])
  );
  const previewPlayers = players
    .map((player) => {
      const expectedRank = expectedRankByPlayer.get(player.playerId) ?? player.currentRank;

      return {
        ...player,
        eligible: eligibleIds.has(player.playerId),
        expectedRank,
        matchCount: effectiveMatchCountByPlayer.get(player.playerId) ?? 0,
        penalized:
          eligibleIds.has(player.playerId) && targetIds.has(player.playerId),
        actualDrop: expectedRank - player.currentRank,
      };
    })
    .sort((a, b) => a.currentRank - b.currentRank);

  return {
    targetMonth,
    penaltyDrop,
    alreadyApplied,
    targets: previewPlayers.filter((player) => player.penalized),
    players: previewPlayers,
  };
}
