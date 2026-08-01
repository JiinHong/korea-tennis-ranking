create table public.match_ranking_movements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  played_on date not null,
  rank_before integer not null check (rank_before > 0),
  rank_after integer not null check (rank_after > 0),
  rank_delta integer not null check (rank_delta <> 0),
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index match_ranking_movements_season_date_player_idx
  on public.match_ranking_movements (season_id, played_on, player_id);

alter table public.match_ranking_movements enable row level security;

create policy "Public can read match ranking movements"
  on public.match_ranking_movements
  for select
  to anon, authenticated
  using (true);

grant select on public.match_ranking_movements to anon, authenticated;
grant select, insert, update, delete on public.match_ranking_movements
  to service_role;

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

  delete from public.match_ranking_movements
  where season_id = p_season_id;

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
        select
          season_player.id,
          season_player.player_id,
          season_player.current_rank
        from public.season_players as season_player
        where season_player.season_id = p_season_id
          and season_player.current_rank >= v_defender_rank
          and season_player.current_rank < v_challenger_rank
        order by season_player.current_rank desc
      loop
        insert into public.match_ranking_movements (
          club_id,
          season_id,
          match_id,
          player_id,
          played_on,
          rank_before,
          rank_after,
          rank_delta
        ) values (
          v_match.club_id,
          p_season_id,
          v_match.id,
          v_shifted_player.player_id,
          v_match.played_on,
          v_shifted_player.current_rank,
          v_shifted_player.current_rank + 1,
          -1
        );

        update public.season_players
        set current_rank = current_rank + 1,
            updated_at = now()
        where id = v_shifted_player.id;
      end loop;

      insert into public.match_ranking_movements (
        club_id,
        season_id,
        match_id,
        player_id,
        played_on,
        rank_before,
        rank_after,
        rank_delta
      ) values (
        v_match.club_id,
        p_season_id,
        v_match.id,
        v_challenger_id,
        v_match.played_on,
        v_challenger_rank,
        v_defender_rank,
        v_challenger_rank - v_defender_rank
      );

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

do $$
declare
  season_row record;
begin
  for season_row in
    select season.id
    from public.seasons as season
    where season.is_current = true
      and exists (
        select 1
        from public.season_players as season_player
        where season_player.season_id = season.id
      )
      and not exists (
        select 1
        from public.matches as match_row
        where match_row.season_id = season.id
          and match_row.status = 'confirmed'
          and (
            not exists (
              select 1
              from public.season_players as challenger
              where challenger.season_id = season.id
                and challenger.player_id = match_row.challenger_player_id
            )
            or not exists (
              select 1
              from public.season_players as defender
              where defender.season_id = season.id
                and defender.player_id = match_row.defender_player_id
            )
          )
      )
  loop
    perform private.recalculate_season_rankings(season_row.id);
  end loop;
end;
$$;
