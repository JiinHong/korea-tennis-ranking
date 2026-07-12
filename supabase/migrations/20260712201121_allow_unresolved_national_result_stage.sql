alter table public.national_team_results
  alter column stage drop not null;

alter table public.national_team_results
  drop constraint if exists national_team_results_verified_stage_check;

alter table public.national_team_results
  add constraint national_team_results_verified_stage_check
  check (quality_status <> 'verified' or stage is not null);
