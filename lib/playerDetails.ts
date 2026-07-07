import type { HistoricalMatchRecord } from "@/lib/historicalMatchLogTable";
import type { MatchRecord } from "@/lib/matchLogTable";
import type { Player } from "@/lib/rankingData";

export type MatchResult = "W" | "L";
export type MatchRole = "도전자" | "방어자";

export type RecordSummary = {
  wins: number;
  losses: number;
  matches: number;
};

export type SeasonRecord = RecordSummary & {
  season: string;
  winRate: number;
};

export type OpponentRecord = RecordSummary & {
  opponent: string;
  winRate: number;
  latestDate: string;
  latestScore: string;
  latestResult: MatchResult;
};

export type PlayerRecentMatch = {
  date: string;
  season: string;
  opponent: string;
  result: MatchResult;
  score: string;
  role: MatchRole;
  defenseResult: string;
};

export type PlayerDetail = RecordSummary & {
  name: string;
  rank: number;
  note: string;
  winRate: number;
  challengerRecord: RecordSummary;
  defenderRecord: RecordSummary;
  seasonRecords: SeasonRecord[];
  opponentRecords: OpponentRecord[];
  recentMatches: PlayerRecentMatch[];
};

type MatchWithSeason = MatchRecord & {
  season: string;
};

function emptySummary(): RecordSummary {
  return {
    wins: 0,
    losses: 0,
    matches: 0,
  };
}

function winRate(summary: RecordSummary): number {
  if (summary.matches === 0) {
    return 0;
  }

  return Math.round((summary.wins / summary.matches) * 100);
}

function addResult(summary: RecordSummary, result: MatchResult) {
  summary.matches += 1;

  if (result === "W") {
    summary.wins += 1;
  } else {
    summary.losses += 1;
  }
}

function parseDateValue(date: string): number {
  const numbers = date.match(/\d+/g)?.map(Number) ?? [];
  const [year = 0, month = 1, day = 1] = numbers;

  return new Date(year, month - 1, day).getTime();
}

function compareMatchDateDesc(a: { date: string }, b: { date: string }) {
  return parseDateValue(b.date) - parseDateValue(a.date);
}

function seasonSortValue(season: string): number {
  const seasonNumber = season.match(/\d+/)?.[0];

  if (!seasonNumber) {
    return 0;
  }

  return Number(seasonNumber);
}

function compareSeasonDesc(a: SeasonRecord, b: SeasonRecord) {
  return seasonSortValue(b.season) - seasonSortValue(a.season);
}

function getOpponent(match: MatchRecord, playerName: string) {
  if (match.challenger === playerName) {
    return match.defender;
  }

  if (match.defender === playerName) {
    return match.challenger;
  }

  return null;
}

function getRole(match: MatchRecord, playerName: string): MatchRole | null {
  if (match.challenger === playerName) {
    return "도전자";
  }

  if (match.defender === playerName) {
    return "방어자";
  }

  return null;
}

function getResult(match: MatchRecord, playerName: string): MatchResult | null {
  if (match.winner === playerName) {
    return "W";
  }

  if (match.challenger === playerName || match.defender === playerName) {
    return "L";
  }

  return null;
}

function toSeasonRecord(season: string, summary: RecordSummary): SeasonRecord {
  return {
    season,
    wins: summary.wins,
    losses: summary.losses,
    matches: summary.matches,
    winRate: winRate(summary),
  };
}

export function buildPlayerDetails(
  players: Player[],
  currentMatches: MatchRecord[],
  historicalMatches: HistoricalMatchRecord[],
  currentSeason: string
): Record<string, PlayerDetail> {
  const matches: MatchWithSeason[] = [
    ...currentMatches.map((match) => ({
      ...match,
      season: currentSeason,
    })),
    ...historicalMatches.map((match) => ({
      ...match,
      season: match.season,
    })),
  ].sort(compareMatchDateDesc);

  const details: Record<string, PlayerDetail> = {};

  for (const player of players) {
    const total = emptySummary();
    const challengerRecord = emptySummary();
    const defenderRecord = emptySummary();
    const seasonMap: Record<string, RecordSummary> = {};
    const opponentMap: Record<string, OpponentRecord> = {};
    const recentMatches: PlayerRecentMatch[] = [];

    for (const match of matches) {
      const opponent = getOpponent(match, player.name);
      const result = getResult(match, player.name);
      const role = getRole(match, player.name);

      if (!opponent || !result || !role) {
        continue;
      }

      addResult(total, result);
      addResult(role === "도전자" ? challengerRecord : defenderRecord, result);

      seasonMap[match.season] ??= emptySummary();
      addResult(seasonMap[match.season], result);

      opponentMap[opponent] ??= {
        opponent,
        wins: 0,
        losses: 0,
        matches: 0,
        winRate: 0,
        latestDate: match.date,
        latestScore: match.score,
        latestResult: result,
      };

      addResult(opponentMap[opponent], result);

      recentMatches.push({
        date: match.date,
        season: match.season,
        opponent,
        result,
        score: match.score,
        role,
        defenseResult: match.defenseResult,
      });
    }

    const seasonRecords = Object.entries(seasonMap)
      .map(([season, summary]) => toSeasonRecord(season, summary))
      .sort(compareSeasonDesc);

    const opponentRecords = Object.values(opponentMap)
      .map((record) => ({
        ...record,
        winRate: winRate(record),
      }))
      .sort(
        (a, b) =>
          b.matches - a.matches ||
          b.wins - a.wins ||
          parseDateValue(b.latestDate) - parseDateValue(a.latestDate) ||
          a.opponent.localeCompare(b.opponent, "ko")
      );

    details[player.name] = {
      name: player.name,
      rank: player.rank,
      note: player.note,
      wins: total.wins,
      losses: total.losses,
      matches: total.matches,
      winRate: winRate(total),
      challengerRecord,
      defenderRecord,
      seasonRecords,
      opponentRecords,
      recentMatches,
    };
  }

  return details;
}
