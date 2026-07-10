import "server-only";

import type { PlayerStatus } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type AdminClubOverview = {
  id: string;
  slug: string;
  name: string;
  title: string;
  season: {
    id: string;
    name: string;
    startsOn: string | null;
    endsOn: string | null;
  } | null;
  roster: Record<PlayerStatus, number> & { total: number };
  matches: {
    confirmed: number;
    latestPlayedOn: string | null;
  };
  injuries: {
    active: number;
  };
  rules: {
    challengeRange: number;
    rematchCooldownDays: number;
    inactivityPenaltyDrop: number;
    injuryExemptionLimit: number;
    injuryNoticeDeadlineDaysBeforeMonthEnd: number;
  } | null;
};

type AdminClubRow = {
  id: string;
  slug: string;
  name: string;
  title: string;
};

type AdminSeasonRow = {
  id: string;
  clubId: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
};

type AdminSeasonPlayerRow = {
  seasonId: string;
  status: PlayerStatus;
};

type AdminMatchRow = {
  seasonId: string;
  playedOn: string;
};

type AdminInjuryRow = {
  seasonId: string;
  startsOn: string;
  endsOn: string | null;
};

type AdminRuleRow = NonNullable<AdminClubOverview["rules"]> & {
  seasonId: string;
};

export type SupabaseAdminOverviewAdapter = {
  listActiveClubs(): Promise<AdminClubRow[]>;
  listCurrentSeasons(): Promise<AdminSeasonRow[]>;
  listSeasonPlayers(seasonIds: string[]): Promise<AdminSeasonPlayerRow[]>;
  listConfirmedMatches(seasonIds: string[]): Promise<AdminMatchRow[]>;
  listApprovedInjuries(seasonIds: string[]): Promise<AdminInjuryRow[]>;
  listRuleConfigs(seasonIds: string[]): Promise<AdminRuleRow[]>;
};

function getSeoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function emptyRoster(): AdminClubOverview["roster"] {
  return {
    total: 0,
    active: 0,
    injured: 0,
    inactive: 0,
    left: 0,
  };
}

function isActiveInjury(injury: AdminInjuryRow, today: string): boolean {
  return injury.startsOn <= today && (!injury.endsOn || injury.endsOn >= today);
}

export async function getAdminClubOverviews(
  adapter: SupabaseAdminOverviewAdapter = createSupabaseAdminOverviewAdapter(),
  today = getSeoulDate()
): Promise<AdminClubOverview[]> {
  const [clubs, seasons] = await Promise.all([
    adapter.listActiveClubs(),
    adapter.listCurrentSeasons(),
  ]);
  const seasonIds = seasons.map((season) => season.id);

  let seasonPlayers: AdminSeasonPlayerRow[] = [];
  let matches: AdminMatchRow[] = [];
  let injuries: AdminInjuryRow[] = [];
  let rules: AdminRuleRow[] = [];

  if (seasonIds.length > 0) {
    [seasonPlayers, matches, injuries, rules] = await Promise.all([
      adapter.listSeasonPlayers(seasonIds),
      adapter.listConfirmedMatches(seasonIds),
      adapter.listApprovedInjuries(seasonIds),
      adapter.listRuleConfigs(seasonIds),
    ]);
  }

  const seasonByClub = new Map(seasons.map((season) => [season.clubId, season]));

  return clubs
    .map((club) => {
      const season = seasonByClub.get(club.id) ?? null;
      const roster = emptyRoster();

      if (!season) {
        return {
          ...club,
          season: null,
          roster,
          matches: { confirmed: 0, latestPlayedOn: null },
          injuries: { active: 0 },
          rules: null,
        };
      }

      const clubPlayers = seasonPlayers.filter(
        (player) => player.seasonId === season.id
      );

      for (const player of clubPlayers) {
        roster.total += 1;
        roster[player.status] += 1;
      }

      const clubMatches = matches.filter((match) => match.seasonId === season.id);
      const latestPlayedOn = clubMatches.reduce<string | null>(
        (latest, match) => (!latest || match.playedOn > latest ? match.playedOn : latest),
        null
      );
      const activeInjuries = injuries.filter(
        (injury) => injury.seasonId === season.id && isActiveInjury(injury, today)
      ).length;
      const ruleConfig = rules.find((rule) => rule.seasonId === season.id);

      return {
        ...club,
        season: {
          id: season.id,
          name: season.name,
          startsOn: season.startsOn,
          endsOn: season.endsOn,
        },
        roster,
        matches: {
          confirmed: clubMatches.length,
          latestPlayedOn,
        },
        injuries: { active: activeInjuries },
        rules: ruleConfig
          ? {
              challengeRange: ruleConfig.challengeRange,
              rematchCooldownDays: ruleConfig.rematchCooldownDays,
              inactivityPenaltyDrop: ruleConfig.inactivityPenaltyDrop,
              injuryExemptionLimit: ruleConfig.injuryExemptionLimit,
              injuryNoticeDeadlineDaysBeforeMonthEnd:
                ruleConfig.injuryNoticeDeadlineDaysBeforeMonthEnd,
            }
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function createSupabaseAdminOverviewAdapter(): SupabaseAdminOverviewAdapter {
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
        .select("season_id, status")
        .in("season_id", seasonIds);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        seasonId: row.season_id,
        status: row.status as PlayerStatus,
      }));
    },
    async listConfirmedMatches(seasonIds) {
      const { data, error } = await supabase
        .from("matches")
        .select("season_id, played_on")
        .in("season_id", seasonIds)
        .eq("status", "confirmed");

      if (error) throw error;
      return (data ?? []).map((row) => ({
        seasonId: row.season_id,
        playedOn: row.played_on,
      }));
    },
    async listApprovedInjuries(seasonIds) {
      const { data, error } = await supabase
        .from("injury_periods")
        .select("season_id, starts_on, ends_on")
        .in("season_id", seasonIds)
        .eq("approved", true);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        seasonId: row.season_id,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
      }));
    },
    async listRuleConfigs(seasonIds) {
      const { data, error } = await supabase
        .from("rule_configs")
        .select(
          "season_id, challenge_range, rematch_cooldown_days, inactivity_penalty_drop, injury_exemption_limit, injury_notice_deadline_days_before_month_end"
        )
        .in("season_id", seasonIds);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        seasonId: row.season_id,
        challengeRange: row.challenge_range,
        rematchCooldownDays: row.rematch_cooldown_days,
        inactivityPenaltyDrop: row.inactivity_penalty_drop,
        injuryExemptionLimit: row.injury_exemption_limit,
        injuryNoticeDeadlineDaysBeforeMonthEnd:
          row.injury_notice_deadline_days_before_month_end,
      }));
    },
  };
}
