import type { SupabaseSeedPlan } from "@/lib/supabaseSeedPlan";

type SeedMatch = SupabaseSeedPlan["matches"][number];

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function wrapTransaction(sql: string): string {
  return `
begin;

${sql}

commit;
`.trim();
}

function buildBaseSqlBody(plan: SupabaseSeedPlan): string {
  return `
with club_input as (
  select *
  from jsonb_to_record(${sqlJson(plan.club)}) as club(
    slug text,
    title text,
    organization text,
    subtitle text,
    "logoPath" text
  )
),
upserted_club as (
  insert into public.clubs (
    slug,
    name,
    title,
    organization,
    subtitle,
    logo_path,
    is_active
  )
  select
    slug,
    organization,
    title,
    organization,
    subtitle,
    "logoPath",
    true
  from club_input
  on conflict (slug) do update
  set
    name = excluded.name,
    title = excluded.title,
    organization = excluded.organization,
    subtitle = excluded.subtitle,
    logo_path = excluded.logo_path,
    is_active = true
  returning id
),
season_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.seasons)}) as season(
    name text,
    "isCurrent" boolean
  )
)
update public.seasons
set is_current = false
where club_id = (select id from upserted_club)
  and name not in (
    select name
    from season_input
    where "isCurrent" = true
  );

with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(plan.club.slug)}
),
season_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.seasons)}) as season(
    name text,
    "isCurrent" boolean
  )
)
insert into public.seasons (
  club_id,
  name,
  is_current
)
select
  club_row.id,
  season_input.name,
  season_input."isCurrent"
from club_row
cross join season_input
on conflict (club_id, name) do update
set is_current = excluded.is_current;

with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(plan.club.slug)}
),
player_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.players)}) as player(
    name text,
    "displayName" text,
    "normalizedName" text
  )
)
insert into public.players (
  club_id,
  name,
  display_name,
  normalized_name
)
select
  club_row.id,
  player_input.name,
  player_input."displayName",
  player_input."normalizedName"
from club_row
cross join player_input
on conflict (club_id, normalized_name)
where club_id is not null and normalized_name is not null
do update
set
  name = excluded.name,
  display_name = excluded.display_name,
  updated_at = now();

with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(plan.club.slug)}
),
season_row as (
  select seasons.id
  from public.seasons seasons
  join club_row on club_row.id = seasons.club_id
  where seasons.name = ${sqlText(plan.ruleConfig.seasonName)}
)
delete from public.season_players
where club_id = (select id from club_row)
  and season_id = (select id from season_row);

with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(plan.club.slug)}
),
season_player_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.seasonPlayers)}) as season_player(
    "seasonName" text,
    "playerName" text,
    "initialRank" integer,
    "currentRank" integer,
    note text,
    status text
  )
),
resolved as (
  select
    club_row.id as club_id,
    seasons.id as season_id,
    players.id as player_id,
    season_player."initialRank" as initial_rank,
    season_player."currentRank" as current_rank,
    season_player.note,
    season_player.status
  from season_player_input season_player
  join club_row on true
  join public.seasons seasons
    on seasons.club_id = club_row.id
   and seasons.name = season_player."seasonName"
  join public.players players
    on players.club_id = club_row.id
   and players.normalized_name = season_player."playerName"
)
insert into public.season_players (
  club_id,
  season_id,
  player_id,
  initial_rank,
  current_rank,
  note,
  status
)
select
  club_id,
  season_id,
  player_id,
  initial_rank,
  current_rank,
  note,
  status
from resolved;

with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(plan.club.slug)}
),
rule_input as (
  select *
  from jsonb_to_record(${sqlJson(plan.ruleConfig)}) as rule_config(
    "seasonName" text,
    "challengeRange" integer,
    "rematchCooldownDays" integer,
    "inactivityPenaltyDrop" integer
  )
),
resolved as (
  select
    club_row.id as club_id,
    seasons.id as season_id,
    rule_input."challengeRange" as challenge_range,
    rule_input."rematchCooldownDays" as rematch_cooldown_days,
    rule_input."inactivityPenaltyDrop" as inactivity_penalty_drop
  from rule_input
  join club_row on true
  join public.seasons seasons
    on seasons.club_id = club_row.id
   and seasons.name = rule_input."seasonName"
)
insert into public.rule_configs (
  club_id,
  season_id,
  challenge_range,
  rematch_cooldown_days,
  inactivity_penalty_drop
)
select
  club_id,
  season_id,
  challenge_range,
  rematch_cooldown_days,
  inactivity_penalty_drop
from resolved
on conflict (club_id, season_id) do update
set
  challenge_range = excluded.challenge_range,
  rematch_cooldown_days = excluded.rematch_cooldown_days,
  inactivity_penalty_drop = excluded.inactivity_penalty_drop,
  updated_at = now();
`.trim();
}

function buildMatchSqlBody(clubSlug: string, matches: SeedMatch[]): string {
  return `
with club_row as (
  select id
  from public.clubs
  where slug = ${sqlText(clubSlug)}
),
match_input as (
  select *
  from jsonb_to_recordset(${sqlJson(matches)}) as match(
    "seasonName" text,
    "playedOn" date,
    "challengerName" text,
    "defenderName" text,
    "challengerRank" integer,
    "defenderRank" integer,
    "winnerName" text,
    "winnerScore" integer,
    "loserScore" integer,
    "defenseResult" text,
    source text,
    "sourceKey" text
  )
),
resolved as (
  select
    club_row.id as club_id,
    seasons.id as season_id,
    match_input."playedOn" as played_on,
    challenger.id as challenger_player_id,
    defender.id as defender_player_id,
    match_input."challengerRank" as challenger_rank_before,
    match_input."defenderRank" as defender_rank_before,
    winner.id as winner_player_id,
    case
      when winner.id = challenger.id then defender.id
      else challenger.id
    end as loser_player_id,
    match_input."winnerScore" as winner_score,
    match_input."loserScore" as loser_score,
    match_input."defenseResult" as defense_result,
    match_input.source,
    match_input."sourceKey" as source_key
  from match_input
  join club_row on true
  join public.seasons seasons
    on seasons.club_id = club_row.id
   and seasons.name = match_input."seasonName"
  join public.players challenger
    on challenger.club_id = club_row.id
   and challenger.normalized_name = match_input."challengerName"
  join public.players defender
    on defender.club_id = club_row.id
   and defender.normalized_name = match_input."defenderName"
  join public.players winner
    on winner.club_id = club_row.id
   and winner.normalized_name = match_input."winnerName"
)
insert into public.matches (
  club_id,
  season_id,
  played_on,
  challenger_player_id,
  defender_player_id,
  challenger_rank_before,
  defender_rank_before,
  winner_player_id,
  loser_player_id,
  winner_score,
  loser_score,
  defense_result,
  source,
  source_key,
  status
)
select
  club_id,
  season_id,
  played_on,
  challenger_player_id,
  defender_player_id,
  challenger_rank_before,
  defender_rank_before,
  winner_player_id,
  loser_player_id,
  winner_score,
  loser_score,
  defense_result,
  source,
  source_key,
  'confirmed'
from resolved
where not exists (
  select 1
  from public.matches existing
  where existing.club_id = resolved.club_id
    and existing.source_key = resolved.source_key
);
`.trim();
}

export function buildSupabaseBaseSeedSql(plan: SupabaseSeedPlan): string {
  return wrapTransaction(buildBaseSqlBody(plan));
}

export function buildSupabaseMatchSeedSql(
  clubSlug: string,
  matches: SeedMatch[]
): string {
  return wrapTransaction(buildMatchSqlBody(clubSlug, matches));
}

export function buildSupabaseSeedSqlFiles(
  plan: SupabaseSeedPlan,
  matchChunkSize: number
): Array<{ name: string; sql: string }> {
  const chunkSize = Math.max(1, Math.floor(matchChunkSize));
  const files = [
    {
      name: "001-base.sql",
      sql: buildSupabaseBaseSeedSql(plan),
    },
  ];

  for (let index = 0; index < plan.matches.length; index += chunkSize) {
    const fileNumber = String(files.length + 1).padStart(3, "0");
    const chunkNumber = String(Math.floor(index / chunkSize) + 1).padStart(
      3,
      "0"
    );

    files.push({
      name: `${fileNumber}-matches-${chunkNumber}.sql`,
      sql: buildSupabaseMatchSeedSql(
        plan.club.slug,
        plan.matches.slice(index, index + chunkSize)
      ),
    });
  }

  return files;
}

export function buildSupabaseSeedSql(plan: SupabaseSeedPlan): string {
  return wrapTransaction(
    [buildBaseSqlBody(plan), buildMatchSqlBody(plan.club.slug, plan.matches)].join(
      "\n\n"
    )
  );
}
