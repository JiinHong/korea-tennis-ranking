drop policy if exists "Public can read verified national tournament editions"
  on public.national_tournament_editions;

create policy "Public can read verified national tournament editions"
  on public.national_tournament_editions
  for select to anon
  using (source_status = 'verified');

drop policy if exists "Public can read verified top-16 national team results"
  on public.national_team_results;

create policy "Public can read verified top-16 national team results"
  on public.national_team_results
  for select to anon
  using (
    quality_status = 'verified'
    and club_id is not null
    and stage in (
      'champion',
      'runner_up',
      'semifinal',
      'quarterfinal',
      'round_of_16'
    )
  );

grant select (
  id,
  tournament_id,
  edition_year,
  gender,
  actual_entrants,
  source_status
) on public.national_tournament_editions to anon;

grant select (
  id,
  edition_id,
  club_id,
  source_team_name,
  team_label,
  stage,
  quality_status
) on public.national_team_results to anon;

create index if not exists national_team_results_public_club_edition_idx
  on public.national_team_results (club_id, edition_id)
  where quality_status = 'verified'
    and club_id is not null
    and stage in (
      'champion',
      'runner_up',
      'semifinal',
      'quarterfinal',
      'round_of_16'
    );

create or replace view public.public_national_club_results
with (security_invoker = true)
as
with ranked_results as (
  select
    result.club_id,
    edition.id as edition_id,
    tournament.slug as tournament_slug,
    tournament.name as tournament_name,
    edition.edition_year,
    edition.gender,
    edition.actual_entrants,
    result.stage,
    result.source_team_name,
    result.team_label,
    row_number() over (
      partition by result.club_id, edition.id
      order by
        case result.stage
          when 'champion' then 1
          when 'runner_up' then 2
          when 'semifinal' then 3
          when 'quarterfinal' then 4
          when 'round_of_16' then 5
          else 6
        end,
        result.source_team_name,
        result.team_label,
        result.id
    ) as result_rank
  from public.national_team_results as result
  join public.national_tournament_editions as edition
    on edition.id = result.edition_id
    and edition.source_status = 'verified'
  join public.national_tournaments as tournament
    on tournament.id = edition.tournament_id
    and tournament.is_active = true
  where result.quality_status = 'verified'
    and result.club_id is not null
    and result.stage in (
      'champion',
      'runner_up',
      'semifinal',
      'quarterfinal',
      'round_of_16'
    )
)
select
  club.slug as club_slug,
  club.university_name,
  club.club_name,
  club.display_name,
  ranked_result.tournament_slug,
  ranked_result.tournament_name,
  ranked_result.edition_year,
  ranked_result.gender,
  ranked_result.actual_entrants,
  ranked_result.stage,
  ranked_result.source_team_name,
  ranked_result.team_label
from public.national_clubs as club
left join ranked_results as ranked_result
  on ranked_result.club_id = club.id
where club.is_active = true
  and (
    ranked_result.result_rank = 1
    or ranked_result.result_rank is null
  )
order by
  club.slug,
  ranked_result.edition_year desc nulls last,
  ranked_result.tournament_name,
  ranked_result.gender;

revoke all on public.public_national_club_results
from public, anon, authenticated;

grant select on public.public_national_club_results to anon;
grant select on public.public_national_club_results to service_role;
