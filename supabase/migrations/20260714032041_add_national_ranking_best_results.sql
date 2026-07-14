alter table public.national_ranking_rows
  add column if not exists best_results jsonb not null default '[]'::jsonb;

alter table public.national_ranking_rows
  add constraint national_ranking_rows_best_results_array_check
  check (jsonb_typeof(best_results) = 'array');

create or replace view public.latest_national_rankings
with (security_invoker = true)
as
select
  ranking_row.snapshot_id,
  formula.version as formula_version,
  formula.effective_on,
  snapshot.source_revision,
  snapshot.created_at as calculated_at,
  snapshot.published_at,
  ranking_row.gender,
  ranking_row.rank,
  ranking_row.club_id,
  club.slug as club_slug,
  club.university_name,
  club.club_name,
  club.display_name,
  ranking_row.total_points,
  ranking_row.latest_edition_points,
  ranking_row.max_contribution,
  ranking_row.championships,
  ranking_row.runner_ups,
  ranking_row.contributions,
  ranking_row.honors,
  ranking_row.best_results
from public.national_ranking_snapshots as snapshot
join public.national_formula_versions as formula
  on formula.version = snapshot.formula_version
  and formula.is_active = true
join public.national_ranking_rows as ranking_row
  on ranking_row.snapshot_id = snapshot.id
join public.national_clubs as club
  on club.id = ranking_row.club_id
  and club.is_active = true
where snapshot.is_published = true
order by ranking_row.gender, ranking_row.rank;

revoke all on public.latest_national_rankings
from public, anon, authenticated;

grant select on public.latest_national_rankings to anon;
grant select on public.latest_national_rankings to service_role;
