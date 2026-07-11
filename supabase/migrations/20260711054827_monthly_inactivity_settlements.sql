update public.seasons as season
set starts_on = first_match.first_month
from (
  select
    match_row.season_id,
    date_trunc('month', min(match_row.played_on))::date as first_month
  from public.matches as match_row
  where match_row.status = 'confirmed'
  group by match_row.season_id
) as first_match
where season.id = first_match.season_id
  and season.starts_on is null;

create table if not exists public.monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  target_month date not null,
  penalty_drop integer not null check (penalty_drop > 0),
  eligible_player_ids uuid[] not null default '{}'::uuid[],
  target_player_ids uuid[] not null default '{}'::uuid[],
  rank_before jsonb not null default '[]'::jsonb,
  rank_after jsonb not null default '[]'::jsonb,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (season_id, target_month),
  check (target_month = date_trunc('month', target_month)::date)
);

create index if not exists monthly_settlements_club_month_idx
  on public.monthly_settlements (club_id, target_month desc);

alter table public.monthly_settlements enable row level security;

drop policy if exists "Public can read monthly settlements"
  on public.monthly_settlements;

create policy "Public can read monthly settlements"
  on public.monthly_settlements
  for select to anon
  using (true);

grant select on public.monthly_settlements to anon;

grant select, insert, update, delete on public.monthly_settlements
  to service_role;

create or replace function private.apply_monthly_penalty_to_rankings(
  p_season_id uuid,
  p_target_player_ids uuid[],
  p_eligible_player_ids uuid[],
  p_penalty_drop integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order uuid[];
  v_target_ids uuid[] := coalesce(p_target_player_ids, '{}'::uuid[]);
  v_eligible_ids uuid[] := coalesce(p_eligible_player_ids, '{}'::uuid[]);
  v_targets_from_bottom uuid[];
  v_target_id uuid;
  v_target_index integer;
  v_destination_index integer;
  v_index integer;
  v_yielded_places integer;
  v_offset integer;
  v_next_rank integer := 0;
begin
  if p_penalty_drop is null or p_penalty_drop <= 0 then
    raise exception using errcode = '22023', message = '강등 폭은 1 이상이어야 합니다.';
  end if;

  perform season_player.id
  from public.season_players as season_player
  where season_player.season_id = p_season_id
  order by season_player.current_rank
  for update;

  select coalesce(
    array_agg(season_player.player_id order by season_player.current_rank),
    '{}'::uuid[]
  )
    into v_order
  from public.season_players as season_player
  where season_player.season_id = p_season_id;

  select coalesce(
    array_agg(season_player.player_id order by season_player.current_rank desc),
    '{}'::uuid[]
  )
    into v_targets_from_bottom
  from public.season_players as season_player
  where season_player.season_id = p_season_id
    and season_player.player_id = any(v_target_ids)
    and season_player.player_id = any(v_eligible_ids);

  foreach v_target_id in array v_targets_from_bottom
  loop
    v_target_index := array_position(v_order, v_target_id);
    v_destination_index := v_target_index;
    v_yielded_places := 0;

    if v_target_index is not null
      and v_target_index < coalesce(array_length(v_order, 1), 0) then
      for v_index in v_target_index + 1..array_length(v_order, 1)
      loop
        if v_order[v_index] = any(v_eligible_ids)
          and not (v_order[v_index] = any(v_target_ids)) then
          v_destination_index := v_index;
          v_yielded_places := v_yielded_places + 1;
        end if;

        exit when v_yielded_places >= p_penalty_drop;
      end loop;
    end if;

    if v_destination_index > v_target_index then
      v_order := array_remove(v_order, v_target_id);
      v_order :=
        coalesce(v_order[1:v_destination_index - 1], '{}'::uuid[])
        || array[v_target_id]
        || coalesce(
          v_order[v_destination_index:array_length(v_order, 1)],
          '{}'::uuid[]
        );
    end if;
  end loop;

  select coalesce(max(season_player.current_rank), 0)
       + count(*)::integer
       + 1000
    into v_offset
  from public.season_players as season_player
  where season_player.season_id = p_season_id;

  update public.season_players
  set current_rank = current_rank + v_offset,
      updated_at = now()
  where season_id = p_season_id;

  foreach v_target_id in array v_order
  loop
    v_next_rank := v_next_rank + 1;

    update public.season_players
    set current_rank = v_next_rank,
        updated_at = now()
    where season_id = p_season_id
      and player_id = v_target_id;
  end loop;
end;
$$;

revoke all on function private.apply_monthly_penalty_to_rankings(
  uuid,
  uuid[],
  uuid[],
  integer
)
from public, authenticated, anon;

create or replace function private.recalculate_season_rankings(p_season_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offset integer;
  event_row record;
  v_match public.matches%rowtype;
  v_settlement public.monthly_settlements%rowtype;
  v_player1_id uuid;
  v_player2_id uuid;
  v_player1_rank integer;
  v_player2_rank integer;
  v_challenger_id uuid;
  v_defender_id uuid;
  v_challenger_rank integer;
  v_defender_rank integer;
  v_loser_id uuid;
  v_defense_result text;
  v_temporary_rank integer;
  v_shifted_player record;
begin
  if not exists (
    select 1 from public.seasons as season where season.id = p_season_id
  ) then
    raise exception using errcode = '22023', message = '시즌을 찾을 수 없습니다.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('season-ranking:' || p_season_id::text, 0)
  );

  perform season_player.id
  from public.season_players as season_player
  where season_player.season_id = p_season_id
  order by season_player.current_rank
  for update;

  select coalesce(max(season_player.current_rank), 0)
       + count(*)::integer
       + 1000
    into v_offset
  from public.season_players as season_player
  where season_player.season_id = p_season_id;

  update public.season_players
  set current_rank = current_rank + v_offset,
      updated_at = now()
  where season_id = p_season_id;

  update public.season_players
  set current_rank = initial_rank,
      updated_at = now()
  where season_id = p_season_id;

  for event_row in
    select replay_event.*
    from (
      select
        'settlement'::text as event_kind,
        (settlement.target_month + interval '1 month')::date as event_date,
        0::integer as event_priority,
        0::bigint as sequence_no,
        null::uuid as match_id,
        settlement.id as settlement_id
      from public.monthly_settlements as settlement
      where settlement.season_id = p_season_id

      union all

      select
        'match'::text as event_kind,
        match_row.played_on as event_date,
        1::integer as event_priority,
        match_row.sequence_no,
        match_row.id as match_id,
        null::uuid as settlement_id
      from public.matches as match_row
      where match_row.season_id = p_season_id
        and match_row.status = 'confirmed'
    ) as replay_event
    order by
      replay_event.event_date,
      replay_event.event_priority,
      replay_event.sequence_no,
      replay_event.match_id
  loop
    if event_row.event_kind = 'settlement' then
      select settlement.*
        into v_settlement
      from public.monthly_settlements as settlement
      where settlement.id = event_row.settlement_id;

      perform private.apply_monthly_penalty_to_rankings(
        p_season_id,
        v_settlement.target_player_ids,
        v_settlement.eligible_player_ids,
        v_settlement.penalty_drop
      );

      continue;
    end if;

    select match_row.*
      into v_match
    from public.matches as match_row
    where match_row.id = event_row.match_id;

    v_player1_id := v_match.challenger_player_id;
    v_player2_id := v_match.defender_player_id;

    select season_player.current_rank
      into v_player1_rank
    from public.season_players as season_player
    where season_player.season_id = p_season_id
      and season_player.player_id = v_player1_id;

    select season_player.current_rank
      into v_player2_rank
    from public.season_players as season_player
    where season_player.season_id = p_season_id
      and season_player.player_id = v_player2_id;

    if v_player1_rank is null or v_player2_rank is null then
      raise exception using errcode = '22023', message = '경기 선수가 현재 시즌 명단에 없습니다.';
    end if;

    if v_player1_rank > v_player2_rank then
      v_challenger_id := v_player1_id;
      v_challenger_rank := v_player1_rank;
      v_defender_id := v_player2_id;
      v_defender_rank := v_player2_rank;
    else
      v_challenger_id := v_player2_id;
      v_challenger_rank := v_player2_rank;
      v_defender_id := v_player1_id;
      v_defender_rank := v_player1_rank;
    end if;

    if v_match.winner_player_id not in (v_player1_id, v_player2_id) then
      raise exception using errcode = '22023', message = '경기 승자가 두 선수 중 한 명이 아닙니다.';
    end if;

    v_loser_id := case
      when v_match.winner_player_id = v_player1_id then v_player2_id
      else v_player1_id
    end;
    v_defense_result := case
      when v_match.winner_player_id = v_challenger_id then '방어 실패'
      else '방어 성공'
    end;

    update public.matches
    set challenger_player_id = v_challenger_id,
        defender_player_id = v_defender_id,
        challenger_rank_before = v_challenger_rank,
        defender_rank_before = v_defender_rank,
        loser_player_id = v_loser_id,
        defense_result = v_defense_result
    where id = v_match.id;

    if v_match.winner_player_id = v_challenger_id then
      select coalesce(max(season_player.current_rank), 0) + 1000
        into v_temporary_rank
      from public.season_players as season_player
      where season_player.season_id = p_season_id;

      update public.season_players
      set current_rank = v_temporary_rank,
          updated_at = now()
      where season_id = p_season_id
        and player_id = v_challenger_id;

      for v_shifted_player in
        select season_player.id
        from public.season_players as season_player
        where season_player.season_id = p_season_id
          and season_player.current_rank >= v_defender_rank
          and season_player.current_rank < v_challenger_rank
        order by season_player.current_rank desc
      loop
        update public.season_players
        set current_rank = current_rank + 1,
            updated_at = now()
        where id = v_shifted_player.id;
      end loop;

      update public.season_players
      set current_rank = v_defender_rank,
          updated_at = now()
      where season_id = p_season_id
        and player_id = v_challenger_id;
    end if;
  end loop;

  perform private.normalize_season_ranks(p_season_id);
end;
$$;

revoke all on function private.recalculate_season_rankings(uuid)
from public, authenticated, anon;

create or replace function public.apply_monthly_penalty_with_secret(
  p_club_slug text,
  p_target_month date,
  p_admin_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_club_id uuid;
  v_season_id uuid;
  v_season_start date;
  v_season_end date;
  v_current_month_start date;
  v_target_month_end date;
  v_penalty_drop integer;
  v_eligible_player_ids uuid[];
  v_target_player_ids uuid[];
  v_rank_before jsonb;
  v_rank_after jsonb;
  v_settlement_id uuid;
begin
  select app_secret.secret_hash
    into v_secret_hash
  from private.app_secrets as app_secret
  where app_secret.name = 'admin_write';

  if v_secret_hash is null
    or p_admin_secret is null
    or extensions.crypt(p_admin_secret, v_secret_hash) <> v_secret_hash then
    raise exception using errcode = '42501', message = '관리자 비밀키가 올바르지 않습니다.';
  end if;

  if p_target_month is null
    or p_target_month <> date_trunc('month', p_target_month)::date then
    raise exception using errcode = '22023', message = '정산 월은 해당 월의 1일이어야 합니다.';
  end if;

  select club.id
    into v_club_id
  from public.clubs as club
  where club.slug = p_club_slug
    and club.is_active = true;

  if v_club_id is null then
    raise exception using errcode = '22023', message = '등록되지 않은 동아리입니다.';
  end if;

  select season.id, season.starts_on, season.ends_on
    into v_season_id, v_season_start, v_season_end
  from public.seasons as season
  where season.club_id = v_club_id
    and season.is_current = true
  for update;

  if v_season_id is null then
    raise exception using errcode = '22023', message = '현재 진행 중인 시즌이 없습니다.';
  end if;

  if v_season_start is null then
    raise exception using errcode = '22023', message = '시즌 시작일이 설정되지 않았습니다.';
  end if;

  v_current_month_start := date_trunc(
    'month',
    now() at time zone 'Asia/Seoul'
  )::date;
  v_target_month_end := (p_target_month + interval '1 month')::date;

  if v_target_month_end > v_current_month_start then
    raise exception using errcode = '22023', message = '완료된 월만 정산할 수 있습니다.';
  end if;

  if p_target_month < date_trunc('month', v_season_start)::date
    or (
      v_season_end is not null
      and p_target_month > date_trunc('month', v_season_end)::date
    ) then
    raise exception using errcode = '22023', message = '시즌 기간에 포함되지 않는 월입니다.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('season-ranking:' || v_season_id::text, 0)
  );

  select rule_config.inactivity_penalty_drop
    into v_penalty_drop
  from public.rule_configs as rule_config
  where rule_config.club_id = v_club_id
    and rule_config.season_id = v_season_id;

  v_penalty_drop := coalesce(v_penalty_drop, 2);

  select coalesce(
    array_agg(season_player.player_id order by season_player.current_rank),
    '{}'::uuid[]
  )
    into v_eligible_player_ids
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.status <> 'left';

  select coalesce(
    array_agg(season_player.player_id order by season_player.current_rank),
    '{}'::uuid[]
  )
    into v_target_player_ids
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.status <> 'left'
    and not exists (
      select 1
      from public.matches as match_row
      where match_row.season_id = v_season_id
        and match_row.status = 'confirmed'
        and match_row.played_on >= p_target_month
        and match_row.played_on < v_target_month_end
        and season_player.player_id in (
          match_row.challenger_player_id,
          match_row.defender_player_id
        )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'playerId', season_player.player_id,
        'rank', season_player.current_rank
      )
      order by season_player.current_rank
    ),
    '[]'::jsonb
  )
    into v_rank_before
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.player_id = any(v_eligible_player_ids);

  insert into public.monthly_settlements (
    club_id,
    season_id,
    target_month,
    penalty_drop,
    eligible_player_ids,
    target_player_ids,
    rank_before
  ) values (
    v_club_id,
    v_season_id,
    p_target_month,
    v_penalty_drop,
    v_eligible_player_ids,
    v_target_player_ids,
    v_rank_before
  )
  on conflict (season_id, target_month) do nothing
  returning id into v_settlement_id;

  if v_settlement_id is null then
    raise exception using errcode = '23505', message = '이미 정산이 완료된 월입니다.';
  end if;

  perform private.recalculate_season_rankings(v_season_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'playerId', season_player.player_id,
        'rank', season_player.current_rank
      )
      order by season_player.current_rank
    ),
    '[]'::jsonb
  )
    into v_rank_after
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.player_id = any(v_eligible_player_ids);

  update public.monthly_settlements
  set rank_after = v_rank_after
  where id = v_settlement_id;

  insert into public.ranking_events (
    club_id,
    season_id,
    event_type,
    actor_type,
    payload
  ) values (
    v_club_id,
    v_season_id,
    'monthly_inactivity_penalty_applied',
    'admin',
    jsonb_build_object(
      'settlementId', v_settlement_id,
      'targetMonth', to_char(p_target_month, 'YYYY-MM'),
      'penaltyDrop', v_penalty_drop,
      'targetPlayerIds', to_jsonb(v_target_player_ids),
      'rankBefore', v_rank_before,
      'rankAfter', v_rank_after
    )
  );

  insert into public.admin_action_logs (
    club_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_club_id,
    'apply_monthly_inactivity_penalty',
    'monthly_settlements',
    v_settlement_id,
    jsonb_build_object(
      'seasonId', v_season_id,
      'targetMonth', to_char(p_target_month, 'YYYY-MM'),
      'penaltyDrop', v_penalty_drop,
      'targetPlayerIds', to_jsonb(v_target_player_ids)
    )
  );

  return jsonb_build_object(
    'settlementId', v_settlement_id,
    'targetMonth', to_char(p_target_month, 'YYYY-MM'),
    'penaltyDrop', v_penalty_drop,
    'targetPlayerIds', to_jsonb(v_target_player_ids),
    'rankBefore', v_rank_before,
    'rankAfter', v_rank_after
  );
end;
$$;

revoke execute on function public.apply_monthly_penalty_with_secret(
  text,
  date,
  text
)
from public, authenticated, anon;

grant execute on function public.apply_monthly_penalty_with_secret(
  text,
  date,
  text
)
to anon, service_role;
