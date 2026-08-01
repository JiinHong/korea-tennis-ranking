create schema if not exists private;

create table public.weekly_ranking_snapshots (
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  week_start date not null,
  rank integer not null check (rank > 0),
  captured_at timestamptz not null default now(),
  primary key (season_id, player_id, week_start)
);

create index weekly_ranking_snapshots_player_id_idx
  on public.weekly_ranking_snapshots (player_id);

alter table public.weekly_ranking_snapshots enable row level security;

create policy "Public can read weekly ranking snapshots"
  on public.weekly_ranking_snapshots
  for select
  to anon, authenticated
  using (true);

grant select on public.weekly_ranking_snapshots to anon, authenticated;
grant select, insert, update, delete on public.weekly_ranking_snapshots to service_role;

create or replace function private.capture_weekly_ranking_snapshots(
  p_week_start date default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date := coalesce(
    p_week_start,
    (now() at time zone 'Asia/Seoul')::date
      - (extract(isodow from now() at time zone 'Asia/Seoul')::integer - 1)
  );
  v_inserted integer;
begin
  insert into public.weekly_ranking_snapshots (
    season_id,
    player_id,
    week_start,
    rank
  )
  select
    season_player.season_id,
    season_player.player_id,
    v_week_start,
    season_player.current_rank
  from public.season_players as season_player
  join public.seasons as season
    on season.id = season_player.season_id
  where season.is_current = true
    and season_player.status <> 'left'
  on conflict (season_id, player_id, week_start) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function private.capture_weekly_ranking_snapshots(date)
from public, anon, authenticated;

grant execute on function private.capture_weekly_ranking_snapshots(date)
to service_role;

select cron.schedule(
  'weekly-ranking-snapshot',
  '0 15 * * 0',
  $cron$select private.capture_weekly_ranking_snapshots();$cron$
);

select private.capture_weekly_ranking_snapshots();
