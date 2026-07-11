import "server-only";

import {
  buildMonthlyPenaltyPreview,
  type MonthlyPenaltyMatch,
  type MonthlyPenaltyPlayer,
  type MonthlyPenaltyPreview,
  type MonthlyPenaltySettlement,
} from "@/lib/monthlyPenalty";
import type { PlayerStatus } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

type MonthlyClubRow = {
  id: string;
  slug: string;
  name: string;
  title: string;
};

type MonthlySeasonRow = {
  id: string;
  clubId: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
};

type MonthlyPlayerRow = MonthlyPenaltyPlayer & { seasonId: string };
type MonthlyMatchRow = MonthlyPenaltyMatch & { seasonId: string };
type MonthlySettlementRow = MonthlyPenaltySettlement & { seasonId: string };
type MonthlyRuleRow = { seasonId: string; inactivityPenaltyDrop: number };

export type AdminMonthlyClub = MonthlyClubRow & {
  season: Omit<MonthlySeasonRow, "clubId"> | null;
  penaltyDrop: number | null;
  previews: MonthlyPenaltyPreview[];
};

export type SupabaseMonthlySettlementsAdapter = {
  listActiveClubs(): Promise<MonthlyClubRow[]>;
  listCurrentSeasons(): Promise<MonthlySeasonRow[]>;
  listSeasonPlayers(seasonIds: string[]): Promise<MonthlyPlayerRow[]>;
  listSeasonMatches(seasonIds: string[]): Promise<MonthlyMatchRow[]>;
  listSettlements(seasonIds: string[]): Promise<MonthlySettlementRow[]>;
  listRuleConfigs(seasonIds: string[]): Promise<MonthlyRuleRow[]>;
};

function monthOrdinal(value: string): number {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return year * 12 + month - 1;
}

function monthKey(ordinal: number): string {
  const year = Math.floor(ordinal / 12);
  const month = (ordinal % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function completedMonths(
  startsOn: string | null,
  endsOn: string | null,
  today: string
): string[] {
  if (!startsOn) return [];

  const firstMonth = monthOrdinal(startsOn);
  const latestCompletedMonth = monthOrdinal(today) - 1;
  const lastMonth = endsOn
    ? Math.min(monthOrdinal(endsOn), latestCompletedMonth)
    : latestCompletedMonth;
  const result: string[] = [];

  for (let ordinal = lastMonth; ordinal >= firstMonth; ordinal -= 1) {
    result.push(monthKey(ordinal));
  }

  return result;
}

function seoulToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

export async function getAdminMonthlyClubs(
  adapter: SupabaseMonthlySettlementsAdapter =
    createSupabaseMonthlySettlementsAdapter(),
  today = seoulToday()
): Promise<AdminMonthlyClub[]> {
  const [clubs, seasons] = await Promise.all([
    adapter.listActiveClubs(),
    adapter.listCurrentSeasons(),
  ]);
  const seasonIds = seasons.map((season) => season.id);
  let players: MonthlyPlayerRow[] = [];
  let matches: MonthlyMatchRow[] = [];
  let settlements: MonthlySettlementRow[] = [];
  let rules: MonthlyRuleRow[] = [];

  if (seasonIds.length > 0) {
    [players, matches, settlements, rules] = await Promise.all([
      adapter.listSeasonPlayers(seasonIds),
      adapter.listSeasonMatches(seasonIds),
      adapter.listSettlements(seasonIds),
      adapter.listRuleConfigs(seasonIds),
    ]);
  }

  const seasonByClub = new Map(seasons.map((season) => [season.clubId, season]));
  const ruleBySeason = new Map(rules.map((rule) => [rule.seasonId, rule]));

  return clubs
    .map((club) => {
      const season = seasonByClub.get(club.id) ?? null;

      if (!season) {
        return {
          ...club,
          season: null,
          penaltyDrop: null,
          previews: [],
        };
      }

      const penaltyDrop =
        ruleBySeason.get(season.id)?.inactivityPenaltyDrop ?? 2;
      const seasonPlayers = players
        .filter((player) => player.seasonId === season.id)
        .map((player) => ({
          playerId: player.playerId,
          name: player.name,
          initialRank: player.initialRank,
          currentRank: player.currentRank,
          status: player.status,
          joinedAt: player.joinedAt,
        }));
      const seasonMatches = matches
        .filter((match) => match.seasonId === season.id)
        .map((match) => ({
          id: match.id,
          playedOn: match.playedOn,
          sequenceNo: match.sequenceNo,
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          winnerPlayerId: match.winnerPlayerId,
          status: match.status,
        }));
      const seasonSettlements = settlements
        .filter((settlement) => settlement.seasonId === season.id)
        .map((settlement) => ({
          id: settlement.id,
          targetMonth: settlement.targetMonth,
          penaltyDrop: settlement.penaltyDrop,
          eligiblePlayerIds: settlement.eligiblePlayerIds,
          targetPlayerIds: settlement.targetPlayerIds,
          matchCounts: settlement.matchCounts,
        }));
      const previews = completedMonths(
        season.startsOn,
        season.endsOn,
        today
      ).map((targetMonth) =>
        buildMonthlyPenaltyPreview({
          targetMonth,
          penaltyDrop,
          players: seasonPlayers,
          matches: seasonMatches,
          settlements: seasonSettlements,
        })
      );

      return {
        ...club,
        season: {
          id: season.id,
          name: season.name,
          startsOn: season.startsOn,
          endsOn: season.endsOn,
        },
        penaltyDrop,
        previews,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function getAdminMonthlyClub(
  clubSlug: string,
  adapter?: SupabaseMonthlySettlementsAdapter,
  today?: string
): Promise<AdminMonthlyClub | null> {
  const clubs = await getAdminMonthlyClubs(
    adapter ?? createSupabaseMonthlySettlementsAdapter(),
    today
  );
  return clubs.find((club) => club.slug === clubSlug) ?? null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type PlayerRelation = { display_name: string; name: string };

function relationName(player: PlayerRelation): string {
  return player.display_name || player.name;
}

export function createSupabaseMonthlySettlementsAdapter(): SupabaseMonthlySettlementsAdapter {
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
        .select("id, club_id, name, starts_on, ends_on")
        .eq("is_current", true);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        clubId: row.club_id,
        name: row.name,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
      }));
    },
    async listSeasonPlayers(seasonIds) {
      const { data, error } = await supabase
        .from("season_players")
        .select(
          "season_id, player_id, initial_rank, current_rank, status, joined_at, player:players(display_name, name)"
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
          initialRank: row.initial_rank,
          currentRank: row.current_rank,
          status: row.status as PlayerStatus,
          joinedAt: row.joined_at,
        };
      });
    },
    async listSeasonMatches(seasonIds) {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id, season_id, played_on, sequence_no, challenger_player_id, defender_player_id, winner_player_id, status"
        )
        .in("season_id", seasonIds)
        .order("played_on", { ascending: true })
        .order("sequence_no", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        seasonId: row.season_id,
        playedOn: row.played_on,
        sequenceNo: Number(row.sequence_no),
        player1Id: row.challenger_player_id,
        player2Id: row.defender_player_id,
        winnerPlayerId: row.winner_player_id,
        status: row.status as MonthlyPenaltyMatch["status"],
      }));
    },
    async listSettlements(seasonIds) {
      const { data, error } = await supabase
        .from("monthly_settlements")
        .select(
          "id, season_id, target_month, penalty_drop, eligible_player_ids, target_player_ids, match_counts"
        )
        .in("season_id", seasonIds)
        .order("target_month", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        seasonId: row.season_id,
        targetMonth: row.target_month.slice(0, 7),
        penaltyDrop: row.penalty_drop,
        eligiblePlayerIds: row.eligible_player_ids,
        targetPlayerIds: row.target_player_ids,
        matchCounts: row.match_counts as Record<string, number>,
      }));
    },
    async listRuleConfigs(seasonIds) {
      const { data, error } = await supabase
        .from("rule_configs")
        .select("season_id, inactivity_penalty_drop")
        .in("season_id", seasonIds);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        seasonId: row.season_id,
        inactivityPenaltyDrop: row.inactivity_penalty_drop,
      }));
    },
  };
}
