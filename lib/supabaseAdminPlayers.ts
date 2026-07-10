import "server-only";

import type { PlayerStatus } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type AdminSeasonPlayer = {
  seasonPlayerId: string;
  playerId: string;
  name: string;
  initialRank: number;
  currentRank: number;
  note: string;
  status: PlayerStatus;
  joinedAt: string;
  leftAt: string | null;
};

export type AdminPlayerClub = {
  id: string;
  slug: string;
  name: string;
  title: string;
  season: {
    id: string;
    name: string;
  } | null;
  players: AdminSeasonPlayer[];
};

type AdminPlayerClubRow = Omit<AdminPlayerClub, "season" | "players">;

type AdminPlayerSeasonRow = {
  id: string;
  clubId: string;
  name: string;
};

type AdminSeasonPlayerRow = AdminSeasonPlayer & {
  seasonId: string;
};

export type SupabaseAdminPlayersAdapter = {
  listActiveClubs(): Promise<AdminPlayerClubRow[]>;
  listCurrentSeasons(): Promise<AdminPlayerSeasonRow[]>;
  listSeasonPlayers(seasonIds: string[]): Promise<AdminSeasonPlayerRow[]>;
};

export async function getAdminPlayerClubs(
  adapter: SupabaseAdminPlayersAdapter = createSupabaseAdminPlayersAdapter()
): Promise<AdminPlayerClub[]> {
  const [clubs, seasons] = await Promise.all([
    adapter.listActiveClubs(),
    adapter.listCurrentSeasons(),
  ]);
  const seasonIds = seasons.map((season) => season.id);
  const seasonPlayers =
    seasonIds.length > 0 ? await adapter.listSeasonPlayers(seasonIds) : [];
  const seasonByClub = new Map(seasons.map((season) => [season.clubId, season]));

  return clubs
    .map((club) => {
      const season = seasonByClub.get(club.id) ?? null;
      const players = season
        ? seasonPlayers
            .filter((player) => player.seasonId === season.id)
            .sort((a, b) => a.currentRank - b.currentRank)
            .map((player) => ({
              seasonPlayerId: player.seasonPlayerId,
              playerId: player.playerId,
              name: player.name,
              initialRank: player.initialRank,
              currentRank: player.currentRank,
              note: player.note,
              status: player.status,
              joinedAt: player.joinedAt,
              leftAt: player.leftAt,
            }))
        : [];

      return {
        ...club,
        season: season ? { id: season.id, name: season.name } : null,
        players,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function createSupabaseAdminPlayersAdapter(): SupabaseAdminPlayersAdapter {
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
          "id, season_id, player_id, initial_rank, current_rank, note, status, joined_at, left_at, player:players(display_name, name)"
        )
        .in("season_id", seasonIds)
        .order("current_rank", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const player = firstRelation(row.player);

        if (!player) {
          throw new Error("Season player is missing player relation");
        }

        return {
          seasonId: row.season_id,
          seasonPlayerId: row.id,
          playerId: row.player_id,
          name: player.display_name || player.name,
          initialRank: row.initial_rank,
          currentRank: row.current_rank,
          note: row.note,
          status: row.status as PlayerStatus,
          joinedAt: row.joined_at,
          leftAt: row.left_at,
        };
      });
    },
  };
}
