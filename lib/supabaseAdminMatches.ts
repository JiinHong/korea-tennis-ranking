import "server-only";

import type { PlayerStatus } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type AdminMatchStatus = "confirmed" | "voided";

export type AdminMatchPlayer = {
  playerId: string;
  name: string;
  currentRank: number;
  status: PlayerStatus;
};

export type AdminMatchRecord = {
  id: string;
  playedOn: string;
  sequenceNo: number;
  challengerPlayerId: string;
  challengerName: string;
  challengerRankBefore: number | null;
  defenderPlayerId: string;
  defenderName: string;
  defenderRankBefore: number | null;
  winnerPlayerId: string;
  winnerName: string;
  winnerScore: number;
  loserScore: number;
  defenseResult: string;
  source: string;
  status: AdminMatchStatus;
  updatedAt: string;
};

export type AdminMatchClub = {
  id: string;
  slug: string;
  name: string;
  title: string;
  season: { id: string; name: string } | null;
  players: AdminMatchPlayer[];
  matches: AdminMatchRecord[];
};

type AdminMatchClubRow = Omit<AdminMatchClub, "season" | "players" | "matches">;
type AdminMatchSeasonRow = { id: string; clubId: string; name: string };
type AdminMatchPlayerRow = AdminMatchPlayer & { seasonId: string };
type AdminMatchRow = AdminMatchRecord & { seasonId: string };

export type SupabaseAdminMatchesAdapter = {
  listActiveClubs(): Promise<AdminMatchClubRow[]>;
  listCurrentSeasons(): Promise<AdminMatchSeasonRow[]>;
  listSeasonPlayers(seasonIds: string[]): Promise<AdminMatchPlayerRow[]>;
  listSeasonMatches(seasonIds: string[]): Promise<AdminMatchRow[]>;
};

export async function getAdminMatchClubs(
  adapter: SupabaseAdminMatchesAdapter = createSupabaseAdminMatchesAdapter()
): Promise<AdminMatchClub[]> {
  const [clubs, seasons] = await Promise.all([
    adapter.listActiveClubs(),
    adapter.listCurrentSeasons(),
  ]);
  const seasonIds = seasons.map((season) => season.id);
  let players: AdminMatchPlayerRow[] = [];
  let matches: AdminMatchRow[] = [];

  if (seasonIds.length > 0) {
    [players, matches] = await Promise.all([
      adapter.listSeasonPlayers(seasonIds),
      adapter.listSeasonMatches(seasonIds),
    ]);
  }

  const seasonByClub = new Map(seasons.map((season) => [season.clubId, season]));

  return clubs
    .map((club) => {
      const season = seasonByClub.get(club.id) ?? null;

      if (!season) {
        return { ...club, season: null, players: [], matches: [] };
      }

      return {
        ...club,
        season: { id: season.id, name: season.name },
        players: players
          .filter((player) => player.seasonId === season.id)
          .sort((a, b) => a.currentRank - b.currentRank)
          .map((player) => ({
            playerId: player.playerId,
            name: player.name,
            currentRank: player.currentRank,
            status: player.status,
          })),
        matches: matches
          .filter((match) => match.seasonId === season.id)
          .sort(
            (a, b) =>
              b.playedOn.localeCompare(a.playedOn) || b.sequenceNo - a.sequenceNo
          )
          .map((match) => ({
            id: match.id,
            playedOn: match.playedOn,
            sequenceNo: match.sequenceNo,
            challengerPlayerId: match.challengerPlayerId,
            challengerName: match.challengerName,
            challengerRankBefore: match.challengerRankBefore,
            defenderPlayerId: match.defenderPlayerId,
            defenderName: match.defenderName,
            defenderRankBefore: match.defenderRankBefore,
            winnerPlayerId: match.winnerPlayerId,
            winnerName: match.winnerName,
            winnerScore: match.winnerScore,
            loserScore: match.loserScore,
            defenseResult: match.defenseResult,
            source: match.source,
            status: match.status,
            updatedAt: match.updatedAt,
          })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type PlayerRelation = { display_name: string; name: string };

function relationName(value: PlayerRelation): string {
  return value.display_name || value.name;
}

export function createSupabaseAdminMatchesAdapter(): SupabaseAdminMatchesAdapter {
  const supabase = getSupabaseReadClient();

  return {
    async listActiveClubs() {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, slug, name, title")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    async listCurrentSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, club_id, name")
        .eq("is_current", true);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        clubId: row.club_id,
        name: row.name,
      }));
    },
    async listSeasonPlayers(seasonIds) {
      const { data, error } = await supabase
        .from("season_players")
        .select(
          "season_id, player_id, current_rank, status, player:players(display_name, name)"
        )
        .in("season_id", seasonIds)
        .order("current_rank", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => {
        const player = firstRelation(row.player);

        if (!player) throw new Error("Season player is missing player relation");

        return {
          seasonId: row.season_id,
          playerId: row.player_id,
          name: relationName(player),
          currentRank: row.current_rank,
          status: row.status as PlayerStatus,
        };
      });
    },
    async listSeasonMatches(seasonIds) {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          id,
          season_id,
          played_on,
          sequence_no,
          challenger_player_id,
          challenger_rank_before,
          defender_player_id,
          defender_rank_before,
          winner_player_id,
          winner_score,
          loser_score,
          defense_result,
          source,
          status,
          updated_at,
          challenger:players!matches_challenger_player_id_fkey(display_name, name),
          defender:players!matches_defender_player_id_fkey(display_name, name),
          winner:players!matches_winner_player_id_fkey(display_name, name)
        `
        )
        .in("season_id", seasonIds)
        .order("played_on", { ascending: false })
        .order("sequence_no", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => {
        const challenger = firstRelation(row.challenger);
        const defender = firstRelation(row.defender);
        const winner = firstRelation(row.winner);

        if (!challenger || !defender || !winner) {
          throw new Error("Match is missing player relation");
        }

        return {
          id: row.id,
          seasonId: row.season_id,
          playedOn: row.played_on,
          sequenceNo: Number(row.sequence_no),
          challengerPlayerId: row.challenger_player_id,
          challengerName: relationName(challenger),
          challengerRankBefore: row.challenger_rank_before,
          defenderPlayerId: row.defender_player_id,
          defenderName: relationName(defender),
          defenderRankBefore: row.defender_rank_before,
          winnerPlayerId: row.winner_player_id,
          winnerName: relationName(winner),
          winnerScore: row.winner_score,
          loserScore: row.loser_score,
          defenseResult: row.defense_result,
          source: row.source,
          status: row.status as AdminMatchStatus,
          updatedAt: row.updated_at,
        };
      });
    },
  };
}
