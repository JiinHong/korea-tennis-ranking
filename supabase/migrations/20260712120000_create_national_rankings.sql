create extension if not exists "pgcrypto";

create table if not exists public.national_clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  university_name text not null,
  club_name text not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_name, club_name),
  check (btrim(slug) <> ''),
  check (btrim(university_name) <> ''),
  check (btrim(club_name) <> ''),
  check (btrim(display_name) <> '')
);

create table if not exists public.national_club_aliases (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.national_clubs(id) on delete cascade,
  normalized_alias text not null unique,
  source_label text not null,
  created_at timestamptz not null default now(),
  check (btrim(normalized_alias) <> ''),
  check (btrim(source_label) <> '')
);

create table if not exists public.national_tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  scope text not null check (scope in ('national', 'regional')),
  scope_factor numeric not null check (scope_factor in (1.00, 0.85)),
  is_active boolean not null default true,
  check (btrim(slug) <> ''),
  check (btrim(name) <> '')
);

create table if not exists public.national_tournament_editions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.national_tournaments(id) on delete cascade,
  edition_year integer not null check (edition_year between 2000 and 2100),
  gender text not null check (gender in ('men', 'women')),
  actual_entrants integer not null check (actual_entrants > 0),
  source_status text not null check (source_status in ('verified', 'unresolved', 'missing')),
  source_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (tournament_id, edition_year, gender),
  check (jsonb_typeof(source_refs) = 'array'),
  check (
    source_status <> 'verified'
    or case
      when jsonb_typeof(source_refs) = 'array'
        then jsonb_array_length(source_refs) > 0
      else false
    end
  )
);

create table if not exists public.national_team_results (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.national_tournament_editions(id) on delete cascade,
  club_id uuid references public.national_clubs(id) on delete restrict,
  source_team_name text not null,
  team_label text not null default '',
  source_entry_id text not null default '',
  stage text not null check (
    stage in (
      'champion',
      'runner_up',
      'semifinal',
      'quarterfinal',
      'round_of_16',
      'round_of_32',
      'round_of_64',
      'first_match_loss'
    )
  ),
  quality_status text not null check (quality_status in ('verified', 'unresolved', 'missing', 'did_not_enter')),
  source_ref text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (edition_id, source_team_name, team_label, source_entry_id),
  check (btrim(source_team_name) <> ''),
  check (team_label = '' or btrim(team_label) <> ''),
  check (source_entry_id = '' or btrim(source_entry_id) <> ''),
  check (btrim(source_ref) <> ''),
  check (quality_status <> 'verified' or club_id is not null)
);

create table if not exists public.national_formula_versions (
  version text primary key,
  display_name text not null,
  config jsonb not null,
  source_references jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (btrim(version) <> ''),
  check (btrim(display_name) <> ''),
  check (jsonb_typeof(config) = 'object'),
  check (jsonb_typeof(source_references) = 'array')
);

create unique index if not exists national_formula_versions_one_active_idx
  on public.national_formula_versions (is_active)
  where is_active;

create table if not exists public.national_ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  formula_version text not null references public.national_formula_versions(version),
  source_revision text not null,
  source_summary jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (formula_version, source_revision),
  check (btrim(source_revision) <> ''),
  check (jsonb_typeof(source_summary) = 'object'),
  check (not is_published or published_at is not null)
);

create unique index if not exists national_ranking_snapshots_one_published_idx
  on public.national_ranking_snapshots (is_published)
  where is_published;

create table if not exists public.national_ranking_rows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.national_ranking_snapshots(id) on delete cascade,
  gender text not null check (gender in ('men', 'women', 'combined')),
  club_id uuid not null references public.national_clubs(id) on delete restrict,
  rank integer not null check (rank > 0),
  total_points numeric not null check (total_points >= 0),
  latest_edition_points numeric not null check (latest_edition_points >= 0),
  max_contribution numeric not null check (max_contribution >= 0),
  championships integer not null default 0 check (championships >= 0),
  runner_ups integer not null default 0 check (runner_ups >= 0),
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_id, gender, club_id),
  unique (snapshot_id, gender, rank),
  check (jsonb_typeof(contributions) = 'array')
);

create index if not exists national_club_aliases_club_id_idx
  on public.national_club_aliases (club_id);

create index if not exists national_tournament_editions_tournament_id_idx
  on public.national_tournament_editions (tournament_id);

create index if not exists national_team_results_edition_id_idx
  on public.national_team_results (edition_id);

create index if not exists national_team_results_club_id_idx
  on public.national_team_results (club_id);

create index if not exists national_ranking_snapshots_formula_version_idx
  on public.national_ranking_snapshots (formula_version);

create index if not exists national_ranking_rows_snapshot_id_idx
  on public.national_ranking_rows (snapshot_id);

create index if not exists national_ranking_rows_club_id_idx
  on public.national_ranking_rows (club_id);

create index if not exists national_ranking_rows_snapshot_gender_rank_idx
  on public.national_ranking_rows (snapshot_id, gender, rank);

alter table public.national_clubs enable row level security;
alter table public.national_club_aliases enable row level security;
alter table public.national_tournaments enable row level security;
alter table public.national_tournament_editions enable row level security;
alter table public.national_team_results enable row level security;
alter table public.national_formula_versions enable row level security;
alter table public.national_ranking_snapshots enable row level security;
alter table public.national_ranking_rows enable row level security;

revoke all on table public.national_clubs from public, anon, authenticated;
revoke all on table public.national_club_aliases from public, anon, authenticated;
revoke all on table public.national_tournaments from public, anon, authenticated;
revoke all on table public.national_tournament_editions from public, anon, authenticated;
revoke all on table public.national_team_results from public, anon, authenticated;
revoke all on table public.national_formula_versions from public, anon, authenticated;
revoke all on table public.national_ranking_snapshots from public, anon, authenticated;
revoke all on table public.national_ranking_rows from public, anon, authenticated;

drop policy if exists "Public can read active national clubs"
  on public.national_clubs;

create policy "Public can read active national clubs"
  on public.national_clubs
  for select to anon
  using (is_active = true);

drop policy if exists "Public can read active national tournaments"
  on public.national_tournaments;

create policy "Public can read active national tournaments"
  on public.national_tournaments
  for select to anon
  using (is_active = true);

drop policy if exists "Public can read active national formula versions"
  on public.national_formula_versions;

create policy "Public can read active national formula versions"
  on public.national_formula_versions
  for select to anon
  using (is_active = true);

drop policy if exists "Public can read published national ranking snapshots"
  on public.national_ranking_snapshots;

create policy "Public can read published national ranking snapshots"
  on public.national_ranking_snapshots
  for select to anon
  using (is_published = true);

drop policy if exists "Public can read published national ranking rows"
  on public.national_ranking_rows;

create policy "Public can read published national ranking rows"
  on public.national_ranking_rows
  for select to anon
  using (
    exists (
      select 1
      from public.national_ranking_snapshots as snapshot
      where snapshot.id = public.national_ranking_rows.snapshot_id
        and snapshot.is_published = true
    )
  );

drop policy if exists "Service role can manage national clubs"
  on public.national_clubs;

create policy "Service role can manage national clubs"
  on public.national_clubs
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national club aliases"
  on public.national_club_aliases;

create policy "Service role can manage national club aliases"
  on public.national_club_aliases
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national tournaments"
  on public.national_tournaments;

create policy "Service role can manage national tournaments"
  on public.national_tournaments
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national tournament editions"
  on public.national_tournament_editions;

create policy "Service role can manage national tournament editions"
  on public.national_tournament_editions
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national team results"
  on public.national_team_results;

create policy "Service role can manage national team results"
  on public.national_team_results
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national formula versions"
  on public.national_formula_versions;

create policy "Service role can manage national formula versions"
  on public.national_formula_versions
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national ranking snapshots"
  on public.national_ranking_snapshots;

create policy "Service role can manage national ranking snapshots"
  on public.national_ranking_snapshots
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage national ranking rows"
  on public.national_ranking_rows;

create policy "Service role can manage national ranking rows"
  on public.national_ranking_rows
  for all to service_role
  using (true)
  with check (true);

grant select on public.national_clubs to anon;
grant select on public.national_tournaments to anon;
grant select on public.national_formula_versions to anon;
grant select on public.national_ranking_snapshots to anon;
grant select on public.national_ranking_rows to anon;

grant all privileges on public.national_clubs to service_role;
grant all privileges on public.national_club_aliases to service_role;
grant all privileges on public.national_tournaments to service_role;
grant all privileges on public.national_tournament_editions to service_role;
grant all privileges on public.national_team_results to service_role;
grant all privileges on public.national_formula_versions to service_role;
grant all privileges on public.national_ranking_snapshots to service_role;
grant all privileges on public.national_ranking_rows to service_role;
grant usage, select on all sequences in schema public to service_role;

create view public.latest_national_rankings
with (security_invoker = true)
as
select
  ranking_row.snapshot_id,
  formula.version as formula_version,
  snapshot.source_revision,
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
  ranking_row.contributions
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
