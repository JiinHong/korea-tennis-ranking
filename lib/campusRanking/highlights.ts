export type HighlightPlayer = {
  rank: number;
  name: string;
};

export type HighlightMatch = {
  date: string;
  challenger: string;
  defender: string;
  winner: string;
};

export type RecentHighlightKey = "appearances" | "wins" | "defenses";

export type Recent30Highlight = {
  key: RecentHighlightKey;
  label: string;
  playerName: string;
  playerRank: number;
  value: number;
  valueLabel: string;
};

type PlayerCounter = {
  playerName: string;
  playerRank: number;
  appearances: number;
  wins: number;
  defenses: number;
};

function parseMatchDate(value: string): Date | null {
  const parts = value.match(/\d+/g);

  if (!parts || parts.length < 3) {
    return null;
  }

  const [year, month, day] = parts.slice(0, 3).map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isWithinRecent30Days(value: string, now: Date): boolean {
  const matchDate = parseMatchDate(value);

  if (!matchDate) {
    return false;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const recentStart = new Date(today);
  recentStart.setDate(today.getDate() - 30);

  return matchDate >= recentStart && matchDate <= today;
}

function pickLeader(
  counters: PlayerCounter[],
  key: RecentHighlightKey
): PlayerCounter | null {
  return (
    counters
      .filter((counter) => counter[key] > 0)
      .sort((a, b) => {
        const valueDifference = b[key] - a[key];

        if (valueDifference !== 0) {
          return valueDifference;
        }

        const rankDifference = a.playerRank - b.playerRank;

        if (rankDifference !== 0) {
          return rankDifference;
        }

        return a.playerName.localeCompare(b.playerName, "ko");
      })[0] ?? null
  );
}

export function buildRecent30Highlights(
  players: HighlightPlayer[],
  matches: HighlightMatch[],
  now: Date = new Date()
): Recent30Highlight[] {
  const counterByName = new Map<string, PlayerCounter>(
    players.map((player) => [
      player.name,
      {
        playerName: player.name,
        playerRank: player.rank,
        appearances: 0,
        wins: 0,
        defenses: 0,
      },
    ])
  );

  for (const match of matches) {
    if (!isWithinRecent30Days(match.date, now)) {
      continue;
    }

    const challenger = counterByName.get(match.challenger);
    const defender = counterByName.get(match.defender);

    if (!challenger || !defender) {
      continue;
    }

    challenger.appearances += 1;
    defender.appearances += 1;

    const winner = counterByName.get(match.winner);

    if (winner) {
      winner.wins += 1;
    }

    if (match.winner === match.defender) {
      defender.defenses += 1;
    }
  }

  const counters = [...counterByName.values()];
  const definitions: Array<{
    key: RecentHighlightKey;
    label: string;
    suffix: string;
  }> = [
    { key: "appearances", label: "최다 출전", suffix: "경기" },
    { key: "wins", label: "최다 승리", suffix: "승" },
    { key: "defenses", label: "최다 방어", suffix: "회" },
  ];

  return definitions.flatMap(({ key, label, suffix }) => {
    const leader = pickLeader(counters, key);

    if (!leader) {
      return [];
    }

    const value = leader[key];

    return [
      {
        key,
        label,
        playerName: leader.playerName,
        playerRank: leader.playerRank,
        value,
        valueLabel: `${value}${suffix}`,
      },
    ];
  });
}
