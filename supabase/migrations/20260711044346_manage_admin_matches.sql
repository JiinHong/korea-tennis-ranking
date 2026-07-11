alter table public.matches
  add column if not exists sequence_no bigint;

with sequenced as (
  select
    match_row.id,
    row_number() over (
      partition by match_row.season_id
      order by
        match_row.played_on,
        case
          when match_row.source_key ~ '^(current|historical):[0-9]+$'
            then split_part(match_row.source_key, ':', 2)::bigint
          else 9223372036854775807::bigint
        end,
        match_row.created_at,
        match_row.id
    )::bigint as sequence_no
  from public.matches as match_row
)
update public.matches as match_row
set sequence_no = sequenced.sequence_no
from sequenced
where match_row.id = sequenced.id
  and match_row.sequence_no is null;

alter table public.matches
  alter column sequence_no set not null;

create unique index if not exists matches_season_sequence_no_idx
  on public.matches (season_id, sequence_no);

create or replace function private.assign_match_sequence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sequence_no is not null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('match-sequence:' || new.season_id::text, 0)
  );

  select coalesce(max(match_row.sequence_no), 0) + 1
    into new.sequence_no
  from public.matches as match_row
  where match_row.season_id = new.season_id;

  return new;
end;
$$;

revoke all on function private.assign_match_sequence()
from public, authenticated, anon;

drop trigger if exists assign_match_sequence_before_insert on public.matches;

create trigger assign_match_sequence_before_insert
before insert on public.matches
for each row execute function private.assign_match_sequence();

create or replace function private.recalculate_season_rankings(p_season_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offset integer;
  v_match record;
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

  for v_match in
    select match_row.*
    from public.matches as match_row
    where match_row.season_id = p_season_id
      and match_row.status = 'confirmed'
    order by match_row.played_on, match_row.sequence_no
  loop
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

create temporary table match_rank_baseline on commit drop as
select
  season_player.id,
  season_player.season_id,
  season_player.player_id,
  season_player.current_rank as working_rank,
  season_player.current_rank as expected_final_rank
from public.season_players as season_player;

do $$
declare
  v_match record;
  v_temporary_rank integer;
begin
  for v_match in
    select match_row.*
    from public.matches as match_row
    where match_row.status = 'confirmed'
      and match_row.defense_result = '방어 실패'
      and match_row.challenger_rank_before is not null
      and match_row.defender_rank_before is not null
      and exists (
        select 1
        from match_rank_baseline as baseline
        where baseline.season_id = match_row.season_id
      )
    order by match_row.played_on desc, match_row.sequence_no desc
  loop
    select coalesce(max(baseline.working_rank), 0) + 1000
      into v_temporary_rank
    from match_rank_baseline as baseline
    where baseline.season_id = v_match.season_id;

    update match_rank_baseline
    set working_rank = v_temporary_rank
    where season_id = v_match.season_id
      and player_id = v_match.challenger_player_id;

    update match_rank_baseline
    set working_rank = working_rank - 1
    where season_id = v_match.season_id
      and working_rank > v_match.defender_rank_before
      and working_rank <= v_match.challenger_rank_before;

    update match_rank_baseline
    set working_rank = v_match.challenger_rank_before
    where season_id = v_match.season_id
      and player_id = v_match.challenger_player_id;
  end loop;
end;
$$;

update public.season_players as season_player
set initial_rank = baseline.working_rank
from match_rank_baseline as baseline
where season_player.id = baseline.id;

do $$
declare
  v_season_id uuid;
begin
  for v_season_id in
    select distinct baseline.season_id from match_rank_baseline as baseline
  loop
    perform private.recalculate_season_rankings(v_season_id);
  end loop;

  if exists (
    select 1
    from match_rank_baseline as baseline
    join public.season_players as season_player on season_player.id = baseline.id
    where season_player.current_rank <> baseline.expected_final_rank
  ) then
    raise exception '순위 기준점 복원 검증에 실패했습니다.';
  end if;
end;
$$;

drop policy if exists "Public can read confirmed matches" on public.matches;
drop policy if exists "Public can read matches" on public.matches;

create policy "Public can read matches" on public.matches
  for select to anon
  using (true);

create or replace function public.manage_admin_match_with_secret(
  p_action text,
  p_club_slug text,
  p_match_id uuid,
  p_player1_id uuid,
  p_player2_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_played_on date,
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
  v_match public.matches%rowtype;
  v_player1_rank integer;
  v_player2_rank integer;
  v_challenger_id uuid;
  v_defender_id uuid;
  v_challenger_rank integer;
  v_defender_rank integer;
  v_winner_id uuid;
  v_loser_id uuid;
  v_winner_score integer;
  v_loser_score integer;
  v_defense_result text;
  v_event_type text;
  v_before jsonb;
  v_after jsonb;
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

  if p_action not in ('edit', 'void', 'restore') then
    raise exception using errcode = '22023', message = '지원하지 않는 경기 관리 작업입니다.';
  end if;

  select club.id
    into v_club_id
  from public.clubs as club
  where club.slug = p_club_slug
    and club.is_active = true;

  if v_club_id is null then
    raise exception using errcode = '22023', message = '등록되지 않은 동아리입니다.';
  end if;

  select season.id
    into v_season_id
  from public.seasons as season
  where season.club_id = v_club_id
    and season.is_current = true;

  if v_season_id is null then
    raise exception using errcode = '22023', message = '현재 진행 중인 시즌이 없습니다.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('season-ranking:' || v_season_id::text, 0)
  );

  select match_row.*
    into v_match
  from public.matches as match_row
  where match_row.id = p_match_id
    and match_row.club_id = v_club_id
    and match_row.season_id = v_season_id
  for update;

  if v_match.id is null then
    raise exception using errcode = '22023', message = '현재 시즌의 경기를 찾을 수 없습니다.';
  end if;

  v_before := jsonb_build_object(
    'playedOn', v_match.played_on,
    'challengerPlayerId', v_match.challenger_player_id,
    'defenderPlayerId', v_match.defender_player_id,
    'winnerPlayerId', v_match.winner_player_id,
    'winnerScore', v_match.winner_score,
    'loserScore', v_match.loser_score,
    'status', v_match.status
  );

  if p_action = 'edit' then
    if p_player1_id is null or p_player2_id is null or p_player1_id = p_player2_id then
      raise exception using errcode = '22023', message = '서로 다른 두 선수를 선택해주세요.';
    end if;

    if p_played_on is null or p_played_on > (now() at time zone 'Asia/Seoul')::date then
      raise exception using errcode = '22023', message = '경기 날짜가 올바르지 않습니다.';
    end if;

    if p_player1_score is null or p_player2_score is null
      or p_player1_score = p_player2_score then
      raise exception using errcode = '22023', message = '동점은 입력할 수 없습니다.';
    end if;

    if greatest(p_player1_score, p_player2_score) <> 6 then
      raise exception using errcode = '22023', message = '승자는 반드시 6점이어야 합니다.';
    end if;

    if least(p_player1_score, p_player2_score) not between 0 and 5 then
      raise exception using errcode = '22023', message = '패자의 점수는 0점부터 5점까지만 가능합니다.';
    end if;

    select season_player.current_rank
      into v_player1_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id
      and season_player.player_id = p_player1_id;

    select season_player.current_rank
      into v_player2_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id
      and season_player.player_id = p_player2_id;

    if v_player1_rank is null or v_player2_rank is null then
      raise exception using errcode = '22023', message = '현재 시즌의 선수를 찾을 수 없습니다.';
    end if;

    if v_player1_rank > v_player2_rank then
      v_challenger_id := p_player1_id;
      v_challenger_rank := v_player1_rank;
      v_defender_id := p_player2_id;
      v_defender_rank := v_player2_rank;
    else
      v_challenger_id := p_player2_id;
      v_challenger_rank := v_player2_rank;
      v_defender_id := p_player1_id;
      v_defender_rank := v_player1_rank;
    end if;

    if p_player1_score > p_player2_score then
      v_winner_id := p_player1_id;
      v_loser_id := p_player2_id;
      v_winner_score := p_player1_score;
      v_loser_score := p_player2_score;
    else
      v_winner_id := p_player2_id;
      v_loser_id := p_player1_id;
      v_winner_score := p_player2_score;
      v_loser_score := p_player1_score;
    end if;

    v_defense_result := case
      when v_winner_id = v_challenger_id then '방어 실패'
      else '방어 성공'
    end;

    update public.matches
    set played_on = p_played_on,
        challenger_player_id = v_challenger_id,
        defender_player_id = v_defender_id,
        challenger_rank_before = v_challenger_rank,
        defender_rank_before = v_defender_rank,
        winner_player_id = v_winner_id,
        loser_player_id = v_loser_id,
        winner_score = v_winner_score,
        loser_score = v_loser_score,
        defense_result = v_defense_result,
        updated_at = now()
    where id = v_match.id;
  elsif p_action = 'void' then
    update public.matches
    set status = 'voided', updated_at = now()
    where id = v_match.id;
  else
    update public.matches
    set status = 'confirmed', updated_at = now()
    where id = v_match.id;
  end if;

  perform private.recalculate_season_rankings(v_season_id);

  select jsonb_build_object(
      'playedOn', match_row.played_on,
      'challengerPlayerId', match_row.challenger_player_id,
      'defenderPlayerId', match_row.defender_player_id,
      'winnerPlayerId', match_row.winner_player_id,
      'winnerScore', match_row.winner_score,
      'loserScore', match_row.loser_score,
      'status', match_row.status
    )
    into v_after
  from public.matches as match_row
  where match_row.id = v_match.id;

  v_event_type := case p_action
    when 'edit' then 'match_edited'
    when 'void' then 'match_voided'
    else 'match_restored'
  end;

  insert into public.ranking_events (
    club_id,
    season_id,
    event_type,
    actor_type,
    payload
  ) values (
    v_club_id,
    v_season_id,
    v_event_type,
    'admin',
    jsonb_build_object('matchId', v_match.id, 'before', v_before, 'after', v_after)
  );

  insert into public.admin_action_logs (
    club_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_club_id,
    v_event_type,
    'matches',
    v_match.id,
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  return jsonb_build_object(
    'action', p_action,
    'matchId', v_match.id,
    'status', v_after->>'status',
    'rankingsRecalculated', true
  );
end;
$$;

revoke execute on function public.manage_admin_match_with_secret(
  text,
  text,
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text
) from public, authenticated, anon;

grant execute on function public.manage_admin_match_with_secret(
  text,
  text,
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text
) to anon, service_role;
