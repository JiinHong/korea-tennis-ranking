import type { ClubConfig } from "@/lib/clubs";
import type { HistoricalMatchRecord } from "@/lib/historicalMatchLogTable";
import type { MatchRecord } from "@/lib/matchLogTable";
import type { RankingData } from "@/lib/rankingTable";
import type { PlayerStatus } from "@/lib/rankingRules";

type SeedSource = {
  club: ClubConfig;
  currentSeasonName: string;
  ranking: RankingData[];
  matches: MatchRecord[];
  historicalMatches: HistoricalMatchRecord[];
};

export type SupabaseSeedPlan = {
  club: {
    slug: string;
    title: string;
    organization: string;
    subtitle: string;
    logoPath: string;
  };
  seasons: Array<{
    name: string;
    isCurrent: boolean;
  }>;
  players: Array<{
    name: string;
    displayName: string;
    normalizedName: string;
  }>;
  seasonPlayers: Array<{
    seasonName: string;
    playerName: string;
    initialRank: number;
    currentRank: number;
    note: string;
    status: PlayerStatus;
  }>;
  matches: Array<{
    seasonName: string;
    playedOn: string;
    challengerName: string;
    defenderName: string;
    challengerRank: number | null;
    defenderRank: number | null;
    winnerName: string;
    winnerScore: number;
    loserScore: number;
    defenseResult: string;
    source: "import";
    sourceKey: string;
  }>;
  ruleConfig: {
    seasonName: string;
    challengeRange: number;
    rematchCooldownDays: number;
    inactivityPenaltyDrop: number;
    injuryExemptionLimit: number;
    injuryNoticeDeadlineDaysBeforeMonthEnd: number;
  };
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function addName(names: Map<string, string>, name: string) {
  const normalizedName = normalizeName(name);

  if (!normalizedName || names.has(normalizedName)) {
    return;
  }

  names.set(normalizedName, normalizedName);
}

function toIsoDate(date: string): string {
  const [year, month, day] = date.match(/\d+/g)?.map(Number) ?? [];

  if (!year || !month || !day) {
    throw new Error(`Invalid match date: ${date}`);
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function parseScore(score: string): { winnerScore: number; loserScore: number } {
  if (!score.trim()) {
    return {
      winnerScore: 6,
      loserScore: 0,
    };
  }

  if (score.includes("기권")) {
    return {
      winnerScore: 6,
      loserScore: 0,
    };
  }

  const [winnerScore, loserScore] = score.match(/\d+/g)?.map(Number) ?? [];

  if (winnerScore === undefined || loserScore === undefined) {
    throw new Error(`Invalid match score: ${score}`);
  }

  return {
    winnerScore,
    loserScore,
  };
}

function inferDefenseResult(match: MatchRecord): string {
  if (match.defenseResult) {
    return match.defenseResult;
  }

  return normalizeName(match.winner) === normalizeName(match.defender)
    ? "방어 성공"
    : "방어 실패";
}

function inferStatus(note: string): PlayerStatus {
  return note.includes("부상") ? "injured" : "active";
}

function seasonSortValue(season: string): number {
  return Number(season.match(/\d+/)?.[0] ?? 0);
}

function toSeedMatch(
  match: MatchRecord,
  seasonName: string,
  sourceKey: string
): SupabaseSeedPlan["matches"][number] {
  const { winnerScore, loserScore } = parseScore(match.score);

  return {
    seasonName,
    playedOn: toIsoDate(match.date),
    challengerName: normalizeName(match.challenger),
    defenderName: normalizeName(match.defender),
    challengerRank: match.challengerRank,
    defenderRank: match.defenderRank,
    winnerName: normalizeName(match.winner),
    winnerScore,
    loserScore,
    defenseResult: inferDefenseResult(match),
    source: "import",
    sourceKey,
  };
}

export function buildSupabaseSeedPlan(source: SeedSource): SupabaseSeedPlan {
  const names = new Map<string, string>();
  const historicalSeasonNames = new Set<string>();

  for (const player of source.ranking) {
    addName(names, player.name);
  }

  for (const match of [...source.matches, ...source.historicalMatches]) {
    addName(names, match.challenger);
    addName(names, match.defender);
    addName(names, match.winner);
  }

  for (const match of source.historicalMatches) {
    historicalSeasonNames.add(match.season);
  }

  return {
    club: {
      slug: source.club.slug,
      title: source.club.title,
      organization: source.club.organization,
      subtitle: source.club.subtitle,
      logoPath: source.club.logoPath,
    },
    seasons: [
      {
        name: source.currentSeasonName,
        isCurrent: true,
      },
      ...Array.from(historicalSeasonNames)
        .sort((a, b) => seasonSortValue(b) - seasonSortValue(a))
        .map((seasonName) => ({
          name: seasonName,
          isCurrent: false,
        })),
    ],
    players: Array.from(names.values()).map((name) => ({
      name,
      displayName: name,
      normalizedName: normalizeName(name),
    })),
    seasonPlayers: source.ranking.map((player) => {
      const name = normalizeName(player.name);

      return {
        seasonName: source.currentSeasonName,
        playerName: name,
        initialRank: player.rank,
        currentRank: player.rank,
        note: player.note,
        status: inferStatus(player.note),
      };
    }),
    matches: [
      ...source.matches.map((match, index) =>
        toSeedMatch(match, source.currentSeasonName, `current:${index + 1}`)
      ),
      ...source.historicalMatches.map((match, index) =>
        toSeedMatch(match, match.season, `historical:${index + 1}`)
      ),
    ],
    ruleConfig: {
      seasonName: source.currentSeasonName,
      challengeRange: 4,
      rematchCooldownDays: 14,
      inactivityPenaltyDrop: 2,
      injuryExemptionLimit: 2,
      injuryNoticeDeadlineDaysBeforeMonthEnd: 7,
    },
  };
}
