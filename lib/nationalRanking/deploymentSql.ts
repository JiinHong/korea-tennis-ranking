import type { NationalRankingSeedPlan } from "./seedPlan";
import type { RankingGender } from "./types";

type DeploymentStage = {
  name: string;
  sql: string;
};

type DeploymentOptions = {
  tournamentSlug: string;
  rowBatchSize?: number;
};

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
  bestResults: NationalRankingSeedPlan["rows"][number]["bestResults"];
  honors: NationalRankingSeedPlan["rows"][number]["honors"];
};

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function wrapTransaction(body: string): string {
  return `begin;\n\n${body.trim()}\n\ncommit;\n`;
}

function sqlDoBlock(body: string, tag: string): string {
  return `do $${tag}$\n${body.trim()}\n$${tag}$;`;
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
      honors: plan.rows.reduce((total, row) => total + row.honors.length, 0),
      bestResults: plan.rows.reduce(
        (total, row) => total + row.bestResults.length,
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

function toRankingRowRecord(
  row: NationalRankingSeedPlan["rows"][number]
): RankingRowRecord {
  return {
    clubSlug: row.clubSlug,
    gender: row.gender,
    rank: row.rank,
    totalPoints: row.totalPoints,
    latestEditionPoints: row.latestEditionPoints,
    maxContribution: row.maxContribution,
    championships: row.championships,
    runnerUps: row.runnerUps,
    contributions: row.contributions,
    bestResults: row.bestResults,
    honors: row.honors,
  };
}

function buildSourceStage(
  plan: NationalRankingSeedPlan,
  tournamentSlug: string
): DeploymentStage {
  const tournament = plan.tournaments.find(
    (candidate) => candidate.slug === tournamentSlug
  );

  if (!tournament) {
    throw new Error(`Unknown tournament slug: ${tournamentSlug}`);
  }

  const editions = plan.editions.filter(
    (edition) => edition.tournamentSlug === tournamentSlug
  );
  const editionKeys = new Set(editions.map((edition) => edition.key));
  const results = plan.results.filter((result) =>
    editionKeys.has(result.editionKey)
  );

  const sql = `
with tournament_input as (
  select *
  from jsonb_to_record(${sqlJson(tournament)}) as tournament(
    slug text,
    name text,
    scope text,
    "scopeFactor" numeric
  )
)
insert into public.national_tournaments (slug, name, scope, scope_factor, is_active)
select slug, name, scope, "scopeFactor", true
from tournament_input
on conflict (slug) do update
set name = excluded.name,
    scope = excluded.scope,
    scope_factor = excluded.scope_factor,
    is_active = true;

with edition_input as (
  select *
  from jsonb_to_recordset(${sqlJson(editions)}) as edition(
    key text,
    "tournamentSlug" text,
    year integer,
    gender text,
    "actualEntrants" integer,
    "sourceStatus" text,
    "sourceRefs" jsonb
  )
), resolved as (
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
select tournament_id, edition_year, gender, actual_entrants, source_status, source_refs
from resolved
on conflict (tournament_id, edition_year, gender) do update
set actual_entrants = excluded.actual_entrants,
    source_status = excluded.source_status,
    source_refs = excluded.source_refs;

${sqlDoBlock(
    `declare
  missing_count integer;
begin
  with result_input as (
    select *
    from jsonb_to_recordset(${sqlJson(results)}) as result(
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
  ), edition_input as (
    select *
    from jsonb_to_recordset(${sqlJson(editions)}) as edition(
      key text,
      "tournamentSlug" text,
      year integer,
      gender text,
      "actualEntrants" integer,
      "sourceStatus" text,
      "sourceRefs" jsonb
    )
  )
  select count(*)
  into missing_count
  from result_input
  left join edition_input on edition_input.key = result_input."editionKey"
  left join public.national_tournaments tournaments
    on tournaments.slug = edition_input."tournamentSlug"
  left join public.national_tournament_editions editions
    on editions.tournament_id = tournaments.id
   and editions.edition_year = edition_input.year
   and editions.gender = edition_input.gender
  left join public.national_clubs clubs
    on clubs.slug = result_input."clubSlug"
  where editions.id is null
     or (result_input."clubSlug" is not null and clubs.id is null);

  if missing_count > 0 then
    raise exception 'incremental national ranking source has % unresolved references', missing_count;
  end if;
end`,
    "national_source_assertion"
  )}

with edition_input as (
  select *
  from jsonb_to_recordset(${sqlJson(editions)}) as edition(
    key text,
    "tournamentSlug" text,
    year integer,
    gender text,
    "actualEntrants" integer,
    "sourceStatus" text,
    "sourceRefs" jsonb
  )
), imported_editions as (
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
using imported_editions
where results.edition_id = imported_editions.id;

with result_input as (
  select *
  from jsonb_to_recordset(${sqlJson(results)}) as result(
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
), edition_input as (
  select *
  from jsonb_to_recordset(${sqlJson(editions)}) as edition(
    key text,
    "tournamentSlug" text,
    year integer,
    gender text,
    "actualEntrants" integer,
    "sourceStatus" text,
    "sourceRefs" jsonb
  )
), resolved as (
  select
    editions.id as edition_id,
    clubs.id as club_id,
    result_input."sourceTeamName" as source_team_name,
    result_input."teamLabel" as team_label,
    coalesce(result_input."sourceEntryId", '') as source_entry_id,
    result_input.stage,
    result_input."qualityStatus" as quality_status,
    result_input."sourceRef" as source_ref,
    result_input.note
  from result_input
  join edition_input on edition_input.key = result_input."editionKey"
  join public.national_tournaments tournaments
    on tournaments.slug = edition_input."tournamentSlug"
  join public.national_tournament_editions editions
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

  return {
    name: `01-${tournamentSlug}-source.sql`,
    sql: wrapTransaction(sql),
  };
}

function buildFormulaStage(plan: NationalRankingSeedPlan): DeploymentStage {
  const sql = `
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
select version, "displayName", config, "effectiveOn", "sourceReferences", false
from formula_input
on conflict (version) do nothing;

${sqlDoBlock(
    `begin
  if exists (
    select 1
    from public.national_formula_versions
    where version = ${sqlText(plan.formula.version)}
      and (
        display_name is distinct from ${sqlText(plan.formula.displayName)}
        or config is distinct from ${sqlJson(plan.formula.config)}
        or effective_on is distinct from ${sqlText(plan.formula.effectiveOn)}::date
        or source_references is distinct from ${sqlJson(plan.formula.sourceReferences)}
      )
  ) then
    raise exception 'formula version conflicts with immutable configuration';
  end if;
end`,
    "national_formula_assertion"
  )}`;

  return { name: "02-formula.sql", sql: wrapTransaction(sql) };
}

function buildSnapshotStage(plan: NationalRankingSeedPlan): DeploymentStage {
  const snapshot = {
    formulaVersion: plan.formula.version,
    sourceRevision: plan.sourceRevision,
    sourceSummary: buildSourceSummary(plan),
  };

  const sql = `
with snapshot_input as (
  select *
  from jsonb_to_record(${sqlJson(snapshot)}) as snapshot(
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
select "formulaVersion", "sourceRevision", "sourceSummary", false, null
from snapshot_input
on conflict (formula_version, source_revision) do nothing;

${sqlDoBlock(
    `begin
  if exists (
    select 1
    from public.national_ranking_snapshots
    where formula_version = ${sqlText(plan.formula.version)}
      and source_revision = ${sqlText(plan.sourceRevision)}
      and (
        is_published = true
        or source_summary is distinct from ${sqlJson(buildSourceSummary(plan))}
      )
  ) then
    raise exception 'target snapshot is already published or has conflicting source metadata';
  end if;
end`,
    "national_snapshot_assertion"
  )}

delete from public.national_ranking_rows
where snapshot_id = (
  select id
  from public.national_ranking_snapshots
  where formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)}
);`;

  return { name: "03-snapshot.sql", sql: wrapTransaction(sql) };
}

function buildRankingStage(
  plan: NationalRankingSeedPlan,
  rows: RankingRowRecord[],
  batchNumber: number
): DeploymentStage {
  const sql = `
${sqlDoBlock(
    `declare
  missing_count integer;
begin
  with row_input as (
    select *
    from jsonb_to_recordset(${sqlJson(rows)}) as ranking_row(
      "clubSlug" text,
      gender text,
      rank integer,
      "totalPoints" numeric,
      "latestEditionPoints" numeric,
      "maxContribution" numeric,
      championships integer,
      "runnerUps" integer,
      contributions jsonb,
      "bestResults" jsonb,
      honors jsonb
    )
  )
  select count(*)
  into missing_count
  from row_input
  left join public.national_clubs clubs on clubs.slug = row_input."clubSlug"
  where clubs.id is null;

  if missing_count > 0 then
    raise exception 'ranking batch has % missing clubs', missing_count;
  end if;

  if not exists (
    select 1
    from public.national_ranking_snapshots
    where formula_version = ${sqlText(plan.formula.version)}
      and source_revision = ${sqlText(plan.sourceRevision)}
      and is_published = false
  ) then
    raise exception 'unpublished target snapshot was not found';
  end if;
end`,
    `national_ranking_batch_${batchNumber}`
  )}

with row_input as (
  select *
  from jsonb_to_recordset(${sqlJson(rows)}) as ranking_row(
    "clubSlug" text,
    gender text,
    rank integer,
    "totalPoints" numeric,
    "latestEditionPoints" numeric,
    "maxContribution" numeric,
    championships integer,
    "runnerUps" integer,
    contributions jsonb,
    "bestResults" jsonb,
    honors jsonb
  )
), target_snapshot as (
  select id
  from public.national_ranking_snapshots
  where formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)}
), resolved as (
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
    row_input.contributions,
    row_input."bestResults" as best_results,
    row_input.honors
  from row_input
  cross join target_snapshot
  join public.national_clubs clubs on clubs.slug = row_input."clubSlug"
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
  contributions,
  best_results,
  honors
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
  contributions,
  best_results,
  honors
from resolved
on conflict (snapshot_id, gender, club_id) do update
set rank = excluded.rank,
    total_points = excluded.total_points,
    latest_edition_points = excluded.latest_edition_points,
    max_contribution = excluded.max_contribution,
    championships = excluded.championships,
    runner_ups = excluded.runner_ups,
    contributions = excluded.contributions,
    best_results = excluded.best_results,
    honors = excluded.honors;`;

  return {
    name: `04-ranking-${String(batchNumber).padStart(2, "0")}.sql`,
    sql: wrapTransaction(sql),
  };
}

function buildPublishStage(plan: NationalRankingSeedPlan): DeploymentStage {
  const sql = sqlDoBlock(
    `declare
  expected_row_count integer := ${plan.rows.length};
  actual_row_count integer;
begin
  select count(*)
  into actual_row_count
  from public.national_ranking_rows rows
  join public.national_ranking_snapshots snapshots on snapshots.id = rows.snapshot_id
  where snapshots.formula_version = ${sqlText(plan.formula.version)}
    and snapshots.source_revision = ${sqlText(plan.sourceRevision)};

  if actual_row_count <> expected_row_count then
    raise exception 'ranking row count mismatch: expected %, got %', expected_row_count, actual_row_count;
  end if;

  update public.national_formula_versions
  set is_active = false
  where is_active = true
    and version <> ${sqlText(plan.formula.version)};

  update public.national_formula_versions
  set is_active = true
  where version = ${sqlText(plan.formula.version)};

  update public.national_ranking_snapshots
  set is_published = false
  where is_published = true
    and not (
      formula_version = ${sqlText(plan.formula.version)}
      and source_revision = ${sqlText(plan.sourceRevision)}
    );

  update public.national_ranking_snapshots
  set is_published = true,
      published_at = coalesce(published_at, now())
  where formula_version = ${sqlText(plan.formula.version)}
    and source_revision = ${sqlText(plan.sourceRevision)};
end`,
    "national_publish"
  );

  return { name: "99-publish.sql", sql: wrapTransaction(sql) };
}

export function buildIncrementalNationalRankingDeploymentSql(
  plan: NationalRankingSeedPlan,
  options: DeploymentOptions
): DeploymentStage[] {
  const rowBatchSize = options.rowBatchSize ?? 20;

  if (!Number.isInteger(rowBatchSize) || rowBatchSize <= 0) {
    throw new Error("rowBatchSize must be a positive integer");
  }

  const rowRecords = plan.rows.map(toRankingRowRecord);
  const rankingStages: DeploymentStage[] = [];

  for (let start = 0; start < rowRecords.length; start += rowBatchSize) {
    rankingStages.push(
      buildRankingStage(
        plan,
        rowRecords.slice(start, start + rowBatchSize),
        rankingStages.length + 1
      )
    );
  }

  return [
    buildSourceStage(plan, options.tournamentSlug),
    buildFormulaStage(plan),
    buildSnapshotStage(plan),
    ...rankingStages,
    buildPublishStage(plan),
  ];
}
