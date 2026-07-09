create extension if not exists "pgcrypto";

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text not null,
  organization text not null,
  subtitle text not null,
  logo_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create unique index if not exists seasons_one_current_per_club
  on public.seasons (club_id)
  where is_current;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  initial_rank integer not null check (initial_rank > 0),
  current_rank integer not null check (current_rank > 0),
  note text not null default '',
  status text not null default 'active' check (status in ('active', 'injured', 'inactive', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id),
  unique (season_id, current_rank)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  played_on date not null,
  challenger_player_id uuid not null references public.players(id) on delete restrict,
  defender_player_id uuid not null references public.players(id) on delete restrict,
  challenger_rank_before integer not null check (challenger_rank_before > 0),
  defender_rank_before integer not null check (defender_rank_before > 0),
  winner_player_id uuid not null references public.players(id) on delete restrict,
  loser_player_id uuid not null references public.players(id) on delete restrict,
  winner_score integer not null check (winner_score = 6),
  loser_score integer not null check (loser_score between 0 and 5),
  defense_result text not null check (defense_result in ('방어 성공', '방어 실패')),
  source text not null default 'public_form' check (source in ('public_form', 'admin', 'import')),
  status text not null default 'confirmed' check (status in ('confirmed', 'voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (challenger_player_id <> defender_player_id),
  check (winner_player_id <> loser_player_id)
);

create table if not exists public.injury_periods (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  starts_on date not null,
  ends_on date,
  reason text not null default '',
  approved boolean not null default true,
  exemption_month text,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rule_configs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  challenge_range integer not null default 4 check (challenge_range > 0),
  rematch_cooldown_days integer not null default 14 check (rematch_cooldown_days >= 0),
  inactivity_penalty_drop integer not null default 2 check (inactivity_penalty_drop > 0),
  injury_exemption_limit integer not null default 2 check (injury_exemption_limit >= 0),
  injury_notice_deadline_days_before_month_end integer not null default 7 check (injury_notice_deadline_days_before_month_end >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, season_id)
);

create table if not exists public.ranking_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  action text not null,
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.season_players enable row level security;
alter table public.matches enable row level security;
alter table public.injury_periods enable row level security;
alter table public.rule_configs enable row level security;
alter table public.ranking_events enable row level security;
alter table public.admin_action_logs enable row level security;

create policy "Public can read active clubs" on public.clubs
  for select to anon
  using (is_active = true);

create policy "Public can read seasons" on public.seasons
  for select to anon
  using (true);

create policy "Public can read players" on public.players
  for select to anon
  using (true);

create policy "Public can read season players" on public.season_players
  for select to anon
  using (true);

create policy "Public can read confirmed matches" on public.matches
  for select to anon
  using (status = 'confirmed');

create policy "Public can read approved injuries" on public.injury_periods
  for select to anon
  using (approved = true);

create policy "Public can read rule configs" on public.rule_configs
  for select to anon
  using (true);

grant select on
  public.clubs,
  public.seasons,
  public.players,
  public.season_players,
  public.matches,
  public.injury_periods,
  public.rule_configs
to anon;

grant select, insert, update, delete on
  public.clubs,
  public.seasons,
  public.players,
  public.season_players,
  public.matches,
  public.injury_periods,
  public.rule_configs,
  public.ranking_events,
  public.admin_action_logs
to service_role;

grant usage, select on all sequences in schema public to service_role;
