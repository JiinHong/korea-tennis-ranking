export type PlayerStatus = "active" | "injured" | "inactive" | "left";

export type RankedPlayer = {
  id: string;
  name: string;
  rank: number;
  status: PlayerStatus;
};

export type RankingRuleConfig = {
  challengeRange: number;
  rematchCooldownDays: number;
  inactivityPenaltyDrop: number;
};

export type MatchInput = {
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  playedOn: string;
};

export type PreviousMatch = {
  playerAId: string;
  playerBId: string;
  playedOn: string;
};

export type RuleResult = { ok: true } | { ok: false; message: string };

export function validateScore(input: MatchInput): RuleResult {
  const scores = [input.player1Score, input.player2Score];

  if (input.player1Score === input.player2Score) {
    return { ok: false, message: "동점은 입력할 수 없습니다." };
  }

  if (!scores.includes(6)) {
    return { ok: false, message: "승자는 반드시 6점이어야 합니다." };
  }

  const loserScore = Math.min(input.player1Score, input.player2Score);

  if (loserScore < 0 || loserScore > 5) {
    return { ok: false, message: "패자의 점수는 0점부터 5점까지만 가능합니다." };
  }

  return { ok: true };
}

export type ResolvedMatchRoles = {
  challenger: RankedPlayer;
  defender: RankedPlayer;
  winnerId: string;
  loserId: string;
};

function findRankedPlayer(
  players: RankedPlayer[],
  playerId: string
): RankedPlayer {
  const player = players.find((candidate) => candidate.id === playerId);

  if (!player) {
    throw new Error("선수를 찾을 수 없습니다.");
  }

  return player;
}

export function resolveMatchRoles(
  players: RankedPlayer[],
  input: MatchInput
): ResolvedMatchRoles {
  const player1 = findRankedPlayer(players, input.player1Id);
  const player2 = findRankedPlayer(players, input.player2Id);
  const challenger = player1.rank > player2.rank ? player1 : player2;
  const defender = player1.rank < player2.rank ? player1 : player2;
  const winnerId =
    input.player1Score > input.player2Score ? input.player1Id : input.player2Id;
  const loserId = winnerId === input.player1Id ? input.player2Id : input.player1Id;

  return {
    challenger,
    defender,
    winnerId,
    loserId,
  };
}

export function applyMatchRanking(
  players: RankedPlayer[],
  challengerId: string,
  defenderId: string,
  winnerId: string
): RankedPlayer[] {
  if (winnerId === defenderId) {
    return players;
  }

  const challenger = findRankedPlayer(players, challengerId);
  const defender = findRankedPlayer(players, defenderId);

  return players
    .map((player) => {
      if (player.id === challenger.id) {
        return { ...player, rank: defender.rank };
      }

      if (player.rank >= defender.rank && player.rank < challenger.rank) {
        return { ...player, rank: player.rank + 1 };
      }

      return player;
    })
    .sort((a, b) => a.rank - b.rank);
}

function activeRankIndex(players: RankedPlayer[], playerId: string): number {
  return players
    .filter((player) => player.status === "active")
    .sort((a, b) => a.rank - b.rank)
    .findIndex((player) => player.id === playerId);
}

export function validateChallengeRange(
  players: RankedPlayer[],
  challengerId: string,
  defenderId: string,
  config: RankingRuleConfig
): RuleResult {
  const challengerIndex = activeRankIndex(players, challengerId);
  const defenderIndex = activeRankIndex(players, defenderId);

  if (challengerIndex === -1 || defenderIndex === -1) {
    return { ok: false, message: "활동 중인 선수끼리만 경기할 수 있습니다." };
  }

  const distance = challengerIndex - defenderIndex;

  if (distance < 1 || distance > config.challengeRange) {
    return { ok: false, message: "도전 가능한 순위 범위를 벗어났습니다." };
  }

  return { ok: true };
}

export function getRematchAvailableOn(
  playedOn: string,
  cooldownDays: number
): string {
  const [year, month, day] = playedOn.split("-").map(Number);
  const available = new Date(Date.UTC(year, month - 1, day + cooldownDays));

  return [
    available.getUTCFullYear(),
    String(available.getUTCMonth() + 1).padStart(2, "0"),
    String(available.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function samePair(input: MatchInput, previousMatch: PreviousMatch): boolean {
  const current = [input.player1Id, input.player2Id].sort().join(":");
  const previous = [previousMatch.playerAId, previousMatch.playerBId]
    .sort()
    .join(":");

  return current === previous;
}

export function validateRematchCooldown(
  input: MatchInput,
  previousMatches: PreviousMatch[],
  config: RankingRuleConfig
): RuleResult {
  const hasRecentMatch = previousMatches.some((match) => {
    return (
      samePair(input, match) &&
      match.playedOn <= input.playedOn &&
      input.playedOn <
        getRematchAvailableOn(match.playedOn, config.rematchCooldownDays)
    );
  });

  if (hasRecentMatch) {
    return { ok: false, message: "동일 선수와는 2주 동안 재경기할 수 없습니다." };
  }

  return { ok: true };
}
