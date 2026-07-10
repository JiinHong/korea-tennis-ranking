import type { HistoricalMatchRecord } from "@/lib/historicalMatchLogTable";
import type { MatchRecord } from "@/lib/matchLogTable";
import type { RankingData } from "@/lib/rankingTable";
import type {
  PlayerStatus,
  PreviousMatch,
  RankedPlayer,
  RankingRuleConfig,
} from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type SupabaseClubRow = {
  id: string;
  slug: string;
};

export type SupabaseSeasonRow = {
  id: string;
  name: string;
};

export type SupabasePlayerIdentity = {
  id: string;
  name: string;
  displayName: string;
};

export type SupabaseSeasonPlayerRow = {
  rank: number;
  note: string;
  status: PlayerStatus;
  player: SupabasePlayerIdentity;
};

export type SupabaseMatchRow = {
  seasonId: string;
  seasonName: string;
  playedOn: string;
  challenger: SupabasePlayerIdentity;
  defender: SupabasePlayerIdentity;
  challengerRank: number;
  defenderRank: number;
  winner: SupabasePlayerIdentity;
  winnerScore: number;
  loserScore: number;
  defenseResult: string;
  source: string;
};

export type SupabaseRankingAdapter = {
  getClubBySlug(slug: string): Promise<SupabaseClubRow | null>;
  getCurrentSeason(clubId: string): Promise<SupabaseSeasonRow | null>;
  listSeasonPlayers(seasonId: string): Promise<SupabaseSeasonPlayerRow[]>;
  listConfirmedMatches(clubId: string): Promise<SupabaseMatchRow[]>;
  getRuleConfig(
    clubId: string,
    seasonId: string
  ): Promise<RankingRuleConfig | null>;
};

export type SupabaseRankingTables = {
  currentSeasonName: string;
  ranking: RankingData[];
  matches: MatchRecord[];
  historicalMatches: HistoricalMatchRecord[];
};

export type SupabaseMatchValidationContext = {
  players: RankedPlayer[];
  previousMatches: PreviousMatch[];
  config: RankingRuleConfig;
};

const defaultRuleConfig: RankingRuleConfig = {
  challengeRange: 4,
  rematchCooldownDays: 14,
  inactivityPenaltyDrop: 2,
};

function displayName(player: SupabasePlayerIdentity): string {
  return player.displayName || player.name;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);

  return `${year}. ${month}. ${day}`;
}

function toMatchRecord(match: SupabaseMatchRow): MatchRecord {
  return {
    date: formatDate(match.playedOn),
    challenger: displayName(match.challenger),
    challengerRank: match.challengerRank,
    defender: displayName(match.defender),
    defenderRank: match.defenderRank,
    winner: displayName(match.winner),
    score: `${match.winnerScore}:${match.loserScore}`,
    defenseResult: match.defenseResult,
  };
}

export async function getSupabaseRankingTables(
  clubSlug: string,
  adapter: SupabaseRankingAdapter = createSupabaseRankingAdapter()
): Promise<SupabaseRankingTables> {
  const club = await adapter.getClubBySlug(clubSlug);

  if (!club) {
    throw new Error(`Supabase club not found: ${clubSlug}`);
  }

  const currentSeason = await adapter.getCurrentSeason(club.id);

  if (!currentSeason) {
    throw new Error(`Current season not found for club: ${clubSlug}`);
  }

  const [seasonPlayers, confirmedMatches] = await Promise.all([
    adapter.listSeasonPlayers(currentSeason.id),
    adapter.listConfirmedMatches(club.id),
  ]);

  const ranking = seasonPlayers
    .filter((seasonPlayer) => seasonPlayer.status !== "left")
    .map((seasonPlayer) => ({
      rank: seasonPlayer.rank,
      name: displayName(seasonPlayer.player),
      note: seasonPlayer.note,
      status: seasonPlayer.status,
    }));

  const matches: MatchRecord[] = [];
  const historicalMatches: HistoricalMatchRecord[] = [];

  for (const match of confirmedMatches) {
    const matchRecord = toMatchRecord(match);

    if (match.seasonId === currentSeason.id) {
      matches.push(matchRecord);
    } else {
      historicalMatches.push({
        ...matchRecord,
        season: match.seasonName,
        sourceNote: match.source,
      });
    }
  }

  return {
    currentSeasonName: currentSeason.name,
    ranking,
    matches,
    historicalMatches,
  };
}

export async function getSupabaseMatchValidationContext(
  clubSlug: string,
  adapter: SupabaseRankingAdapter = createSupabaseRankingAdapter()
): Promise<SupabaseMatchValidationContext> {
  const club = await adapter.getClubBySlug(clubSlug);

  if (!club) {
    throw new Error(`Supabase club not found: ${clubSlug}`);
  }

  const currentSeason = await adapter.getCurrentSeason(club.id);

  if (!currentSeason) {
    throw new Error(`Current season not found for club: ${clubSlug}`);
  }

  const [seasonPlayers, confirmedMatches, ruleConfig] = await Promise.all([
    adapter.listSeasonPlayers(currentSeason.id),
    adapter.listConfirmedMatches(club.id),
    adapter.getRuleConfig(club.id, currentSeason.id),
  ]);

  return {
    players: seasonPlayers
      .filter((seasonPlayer) => seasonPlayer.status !== "left")
      .map((seasonPlayer) => ({
        id: seasonPlayer.player.id,
        name: displayName(seasonPlayer.player),
        rank: seasonPlayer.rank,
        status: seasonPlayer.status,
      })),
    previousMatches: confirmedMatches.map((match) => ({
      playerAId: match.challenger.id,
      playerBId: match.defender.id,
      playedOn: match.playedOn,
    })),
    config: ruleConfig ?? defaultRuleConfig,
  };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toPlayerIdentity(value: unknown): SupabasePlayerIdentity {
  const row = value as {
    id: string;
    name: string;
    display_name: string | null;
  };

  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name ?? row.name,
  };
}

export function createSupabaseRankingAdapter(): SupabaseRankingAdapter {
  const supabase = getSupabaseReadClient();

  return {
    async getClubBySlug(slug) {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    async getCurrentSeason(clubId) {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("club_id", clubId)
        .eq("is_current", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    async listSeasonPlayers(seasonId) {
      const { data, error } = await supabase
        .from("season_players")
        .select("current_rank, note, status, player:players(id, name, display_name)")
        .eq("season_id", seasonId)
        .order("current_rank", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => {
        const player = firstRelation(row.player);

        if (!player) {
          throw new Error("Season player is missing player relation");
        }

        return {
          rank: row.current_rank,
          note: row.note,
          status: row.status as PlayerStatus,
          player: toPlayerIdentity(player),
        };
      });
    },
    async listConfirmedMatches(clubId) {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          season_id,
          played_on,
          challenger_rank_before,
          defender_rank_before,
          winner_score,
          loser_score,
          defense_result,
          source,
          season:seasons(id, name),
          challenger:players!matches_challenger_player_id_fkey(id, name, display_name),
          defender:players!matches_defender_player_id_fkey(id, name, display_name),
          winner:players!matches_winner_player_id_fkey(id, name, display_name)
        `
        )
        .eq("club_id", clubId)
        .eq("status", "confirmed")
        .order("played_on", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => {
        const season = firstRelation(row.season);
        const challenger = firstRelation(row.challenger);
        const defender = firstRelation(row.defender);
        const winner = firstRelation(row.winner);

        if (!season || !challenger || !defender || !winner) {
          throw new Error("Match is missing a required relation");
        }

        return {
          seasonId: row.season_id,
          seasonName: season.name,
          playedOn: row.played_on,
          challenger: toPlayerIdentity(challenger),
          defender: toPlayerIdentity(defender),
          challengerRank: row.challenger_rank_before,
          defenderRank: row.defender_rank_before,
          winner: toPlayerIdentity(winner),
          winnerScore: row.winner_score,
          loserScore: row.loser_score,
          defenseResult: row.defense_result,
          source: row.source,
        };
      });
    },
    async getRuleConfig(clubId, seasonId) {
      const { data, error } = await supabase
        .from("rule_configs")
        .select("challenge_range, rematch_cooldown_days, inactivity_penalty_drop")
        .eq("club_id", clubId)
        .eq("season_id", seasonId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        challengeRange: data.challenge_range,
        rematchCooldownDays: data.rematch_cooldown_days,
        inactivityPenaltyDrop: data.inactivity_penalty_drop,
      };
    },
  };
}
