import type { NationalRankingSeedPlan } from "./seedPlan";
import type { RankingGender } from "./types";

type RankingRowRecord = {
  clubSlug: string;
  gender: RankingGender;
  rank: number;
  totalPoints: number;
  latestEditionPoints: number;
  maxContribution: number;
  championships: number;
  runnerUps: number;
  contributions: NationalRankingSeedPlan["rows"][number]["contributions"];
};

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function wrapTransaction(sql: string): string {
  return `begin;\n\n${sql.trim()}\n\ncommit;`;
}

function countBy<T extends string>(
  values: T[],
  knownValues: readonly T[]
): Record<T, number> {
  const counts = Object.fromEntries(
    knownValues.map((value) => [value, 0])
  ) as Record<T, number>;

  for (const value of values) {
    counts[value] += 1;
  }

  return counts;
}

function buildSourceSummary(plan: NationalRankingSeedPlan) {
  return {
    datasetVersion: plan.datasetVersion,
    formulaVersion: plan.formula.version,
    formulaEffectiveOn: plan.formula.effectiveOn,
    counts: {
      clubs: plan.clubs.length,
      aliases: plan.aliases.length,
      tournaments: plan.tournaments.length,
      editions: plan.editions.length,
      results: plan.results.length,
      rankingRows: plan.rows.length,
      contributions: plan.rows.reduce(
        (total, row) => total + row.contributions.length,
        0
      ),
    },
    editionsBySourceStatus: countBy(
      plan.editions.map((edition) => edition.sourceStatus),
      ["verified", "unresolved", "missing"] as const
    ),
    resultsByQualityStatus: countBy(
      plan.results.map((result) => result.qualityStatus),
      ["verified", "unresolved", "missing", "did_not_enter"] as const
    ),
    rowsByGender: countBy(
      plan.rows.map((row) => row.gender),
      ["men", "women", "combined"] as const
    ),
  };
}

function buildRankingRowRecords(plan: NationalRankingSeedPlan): RankingRowRecord[] {
  return plan.rows.map((row) => ({
    clubSlug: row.clubSlug,
    gender: row.gender,
    rank: row.rank,
    totalPoints: row.totalPoints,
    latestEditionPoints: row.latestEditionPoints,
    maxContribution: row.maxContribution,
    championships: row.championships,
    runnerUps: row.runnerUps,
    contributions: row.contributions,
  }));
}

function clubInputCte(plan: NationalRankingSeedPlan): string {
  return `
club_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.clubs)}) as club(
    slug text,
    "universityName" text,
    "clubName" text,
    "displayName" text
  )
)`;
}

function aliasInputCte(plan: NationalRankingSeedPlan): string {
  return `
alias_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.aliases)}) as alias(
    "clubSlug" text,
    "normalizedAlias" text,
    "sourceLabel" text
  )
)`;
}

function tournamentInputCte(plan: NationalRankingSeedPlan): string {
  return `
tournament_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.tournaments)}) as tournament(
    slug text,
    name text,
    scope text,
    "scopeFactor" numeric
  )
)`;
}

function editionInputCte(plan: NationalRankingSeedPlan): string {
  return `
edition_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.editions)}) as edition(
    key text,
    "tournamentSlug" text,
    year integer,
    gender text,
    "actualEntrants" integer,
    "sourceStatus" text,
    "sourceRefs" jsonb
  )
)`;
}

function resultInputCte(plan: NationalRankingSeedPlan): string {
  return `
result_input as (
  select *
  from jsonb_to_recordset(${sqlJson(plan.results)}) as result(
    "editionKey" text,
    "clubSlug" text,
    "sourceTeamName" text,
    "teamLabel" text,
    "sourceEntryId" text,
    stage text,
    "qualityStatus" text,
    "sourceRef" text,
    note text
  )
)`;
}

function rowInputCte(plan: NationalRankingSeedPlan): string {
  return `
row_input as (
  select *
  from jsonb_to_recordset(${sqlJson(buildRankingRowRecords(plan))}) as ranking_row(
    "clubSlug" text,
    gender text,
    rank integer,
    "totalPoints" numeric,
    "latestEditionPoints" numeric,
    "maxContribution" numeric,
    championships integer,
    "runnerUps" integer,
    contributions jsonb
  )
)`;
}

function buildAssertionSql(plan: NationalRankingSeedPlan): string {
  return `
do $$
begin
  if exists (
    with ${aliasInputCte(plan)}
    select 1
    from alias_input
    left join public.national_clubs clubs
      on clubs.slug = alias_input."clubSlug"
    where clubs.id is null
  ) then
    raise exception 'national ranking seed alias references a missing club';
  end if;
end $$;

do $$
begin
  if exists (
    with ${editionInputCte(plan)}
    select 1
    from edition_input
    left join public.national_tournaments tournaments
      on tournaments.slug = edition_input."tournamentSlug"
    where tournaments.id is null
  ) then
    raise exception 'national ranking seed edition references a missing tournament';
  end if;
end $$;

do $$
begin
  if exists (
    with ${resultInputCte(plan)},
    ${editionInputCte(plan)},
    resolved as (
      select
        result_input."editionKey",
        result_input."clubSlug",
        editions.id as edition_id,
        clubs.id as club_id
      from result_input
      left join edition_input
        on edition_input.key = result_input."editionKey"
      left join public.national_tournaments tournaments
        on tournaments.slug = edition_input."tournamentSlug"
      left join public.national_tournament_editions editions
        on editions.tournament_id = tournaments.id
       and editions.edition_year = edition_input.year
       and editions.gender = edition_input.gender
      left join public.national_clubs clubs
        on clubs.slug = result_input."clubSlug"
    )
    select 1
    from resolved
    where edition_id is null
       or ("clubSlug" is not null and club_id is null)
  ) then
    raise exception 'national ranking seed result references a missing edition or club';
  end if;
end $$;

do $$
begin
  if exists (
    with ${rowInputCte(plan)}
    select 1
    from row_input
    left join public.national_clubs clubs
      on clubs.slug = row_input."clubSlug"
    where clubs.id is null
  ) then
    raise exception 'national ranking seed ranking row references a missing club';
  end if;
end $$;`;
}

function buildSourceSql(plan: NationalRankingSeedPlan): string {
  return `
with ${clubInputCte(plan)}
insert into public.national_clubs (
  slug,
  university_name,
  club_name,
  display_name,
  is_active
)
select
  slug,
  "universityName",
  "clubName",
  "displayName",
  true
from club_input
on conflict (slug) do update
set
  university_name = excluded.university_name,
  club_name = excluded.club_name,
  display_name = excluded.display_name,
  is_active = true,
  updated_at = now();

with ${aliasInputCte(plan)},
resolved as (
  select
    clubs.id as club_id,
    alias_input."normalizedAlias" as normalized_alias,
    alias_input."sourceLabel" as source_label
  from alias_input
  join public.national_clubs clubs
    on clubs.slug = alias_input."clubSlug"
)
insert into public.national_club_aliases (
  club_id,
  normalized_alias,
  source_label
)
select
  club_id,
  normalized_alias,
  source_label
from resolved
on conflict (normalized_alias) do update
set
  club_id = excluded.club_id,
  source_label = excluded.source_label;

with ${tournamentInputCte(plan)}
insert into public.national_tournaments (
  slug,
  name,
  scope,
  scope_factor,
  is_active
)
select
  slug,
  name,
  scope,
  "scopeFactor",
  true
from tournament_input
on conflict (slug) do update
set
  name = excluded.name,
  scope = excluded.scope,
  scope_factor = excluded.scope_factor,
  is_active = true;

with ${editionInputCte(plan)},
resolved as (
  select
    tournaments.id as tournament_id,
    edition_input.year as edition_year,
    edition_input.gender,
    edition_input."actualEntrants" as actual_entrants,
    edition_input."sourceStatus" as source_status,
    edition_input."sourceRefs" as source_refs
  from edition_input
  join public.national_tournaments tournaments
    on tournaments.slug = edition_input."tournamentSlug"
)
insert into public.national_tournament_editions (
  tournament_id,
  edition_year,
  gender,
  actual_entrants,
  source_status,
  source_refs
)
select
  tournament_id,
  edition_year,
  gender,
  actual_entrants,
  source_status,
  source_refs
from resolved
on conflict (tournament_id, edition_year, gender) do update
set
  actual_entrants = excluded.actual_entrants,
  source_status = excluded.source_status,
  source_refs = excluded.source_refs;

${buildAssertionSql(plan)}

with ${editionInputCte(plan)},
imported_edition as (
  select editions.id
  from edition_input
  join public.national_tournaments tournaments
    on tournaments.slug = edition_input."tournamentSlug"
  join public.national_tournament_editions editions
    on editions.tournament_id = tournaments.id
   and editions.edition_year = edition_input.year
   and editions.gender = edition_input.gender
)
delete from public.national_team_results results
using imported_edition
where results.edition_id = imported_edition.id;

with ${resultInputCte(plan)},
${editionInputCte(plan)},
resolved as (
  select
    editions.id as edition_id,
    case
      when result_input."clubSlug" is null
        and result_input."qualityStatus" = 'verified' then null
      when result_input."clubSlug" is null then null
      else clubs.id
    end as club_id,
    result_input."sourceTeamName" as source_team_name,
    result_input."teamLabel" as team_label,
    coalesce(result_input."sourceEntryId", '') as source_entry_id,
    result_input.stage,
    result_input."qualityStatus" as quality_status,
    result_input."sourceRef" as source_ref,
    result_input.note
  from result_input
  left join edition_input
    on edition_input.key = result_input."editionKey"
  left join public.national_tournaments tournaments
    on tournaments.slug = edition_input."tournamentSlug"
  left join public.national_tournament_editions editions
    on editions.tournament_id = tournaments.id
   and editions.edition_year = edition_input.year
   and editions.gender = edition_input.gender
  left join public.national_clubs clubs
    on clubs.slug = result_input."clubSlug"
)
insert into public.national_team_results (
  edition_id,
  club_id,
  source_team_name,
  team_label,
  source_entry_id,
  stage,
  quality_status,
  source_ref,
  note
)
select
  edition_id,
  club_id,
  source_team_name,
  team_label,
  source_entry_id,
  stage,
  quality_status,
  source_ref,
  note
from resolved;`;
}

function buildFormulaSql(plan: NationalRankingSeedPlan): string {
  return `
update public.national_formula_versions
set is_active = false
where is_active = true
  and version <> ${sqlText(plan.formula.version)};

with formula_input as (
  select *
  from jsonb_to_record(${sqlJson(plan.formula)}) as formula(
    version text,
    "displayName" text,
    config jsonb,
    "effectiveOn" date,
    "sourceReferences" jsonb
  )
)
insert into public.national_formula_versions (
  version,
  display_name,
  config,
  effective_on,
  source_references,
  is_active
)
select
  version,
  "displayName",
  config,
  "effectiveOn",
  "sourceReferences",
  true
from formula_input
on conflict (version) do update
set
  display_name = excluded.display_name,
  config = excluded.config,
  effective_on = excluded.effective_on,
  source_references = excluded.source_references,
  is_active = true;`;
}

function buildSnapshotSql(plan: NationalRankingSeedPlan): string {
  const snapshotRecord = {
    formulaVersion: plan.formula.version,
    sourceRevision: plan.sourceRevision,
    sourceSummary: buildSourceSummary(plan),
  };

  return `
with snapshot_input as (
  select *
  from jsonb_to_record(${sqlJson(snapshotRecord)}) as snapshot(
    "formulaVersion" text,
    "sourceRevision" text,
    "sourceSummary" jsonb
  )
)
insert into public.national_ranking_snapshots (
  formula_version,
  source_revision,
  source_summary,
  is_published,
  published_at
)
select
  "formulaVersion",
  "sourceRevision",
  "sourceSummary",
  false,
  null
from snapshot_input
on conflict (formula_version, source_revision) do update
set
  source_summary = excluded.source_summary;

with target_snapshot as (
  select id
  from public.national_ranking_snapshots
  where formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)}
)
delete from public.national_ranking_rows
where snapshot_id = (select id from target_snapshot);

with target_snapshot as (
  select id
  from public.national_ranking_snapshots
  where formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)}
),
${rowInputCte(plan)},
resolved as (
  select
    target_snapshot.id as snapshot_id,
    row_input.gender,
    clubs.id as club_id,
    row_input.rank,
    row_input."totalPoints" as total_points,
    row_input."latestEditionPoints" as latest_edition_points,
    row_input."maxContribution" as max_contribution,
    row_input.championships,
    row_input."runnerUps" as runner_ups,
    row_input.contributions
  from row_input
  cross join target_snapshot
  left join public.national_clubs clubs
    on clubs.slug = row_input."clubSlug"
)
insert into public.national_ranking_rows (
  snapshot_id,
  gender,
  club_id,
  rank,
  total_points,
  latest_edition_points,
  max_contribution,
  championships,
  runner_ups,
  contributions
)
select
  snapshot_id,
  gender,
  club_id,
  rank,
  total_points,
  latest_edition_points,
  max_contribution,
  championships,
  runner_ups,
  contributions
from resolved;

update public.national_ranking_snapshots
set
  is_published = false,
  published_at = null
where is_published = true
  and not (
    formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)}
  );

update public.national_ranking_snapshots
set
  is_published = true,
  published_at = coalesce(published_at, now())
where formula_version = ${sqlText(plan.formula.version)}
  and source_revision = ${sqlText(plan.sourceRevision)};`;
}

export function buildNationalRankingSeedSql(
  plan: NationalRankingSeedPlan
): string {
  return wrapTransaction(
    [
      buildSourceSql(plan),
      buildFormulaSql(plan),
      buildSnapshotSql(plan),
    ].join("\n\n")
  );
}
