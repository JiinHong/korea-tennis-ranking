create or replace function public.record_public_match(
  p_club_slug text,
  p_player1_id uuid,
  p_player2_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_played_on date,
  p_source_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club_id uuid;
  v_season_id uuid;
  v_existing_match public.matches%rowtype;
  v_player1_rank integer;
  v_player2_rank integer;
  v_player1_status text;
  v_player2_status text;
  v_challenger_id uuid;
  v_defender_id uuid;
  v_winner_id uuid;
  v_loser_id uuid;
  v_challenger_rank integer;
  v_defender_rank integer;
  v_challenge_range integer := 4;
  v_rematch_cooldown_days integer := 14;
  v_active_distance integer;
  v_winner_score integer;
  v_loser_score integer;
  v_defense_result text;
  v_rank_changed boolean;
  v_match_id uuid;
  v_temporary_rank integer;
  v_shifted_player record;
begin
  if p_source_key is null or btrim(p_source_key) = '' then
    raise exception using errcode = '22023', message = '제출 식별값이 필요합니다.';
  end if;

  if p_player1_id = p_player2_id then
    raise exception using errcode = '22023', message = '서로 다른 두 선수를 선택해주세요.';
  end if;

  if p_played_on is null or p_played_on > (now() at time zone 'Asia/Seoul')::date then
    raise exception using errcode = '22023', message = '경기 날짜가 올바르지 않습니다.';
  end if;

  if p_player1_score = p_player2_score then
    raise exception using errcode = '22023', message = '동점은 입력할 수 없습니다.';
  end if;

  if greatest(p_player1_score, p_player2_score) <> 6 then
    raise exception using errcode = '22023', message = '승자는 반드시 6점이어야 합니다.';
  end if;

  if least(p_player1_score, p_player2_score) not between 0 and 5 then
    raise exception using errcode = '22023', message = '패자의 점수는 0점부터 5점까지만 가능합니다.';
  end if;

  select club.id
    into v_club_id
  from public.clubs as club
  where club.slug = p_club_slug
    and club.is_active = true;

  if v_club_id is null then
    raise exception using errcode = '22023', message = '등록되지 않은 동아리입니다.';
  end if;

  select match_row.*
    into v_existing_match
  from public.matches as match_row
  where match_row.club_id = v_club_id
    and match_row.source_key = p_source_key
  limit 1;

  if v_existing_match.id is not null then
    return jsonb_build_object(
      'matchId', v_existing_match.id,
      'duplicate', true,
      'defenseResult', v_existing_match.defense_result,
      'rankChanged', v_existing_match.defense_result = '방어 실패'
    );
  end if;

  select season.id
    into v_season_id
  from public.seasons as season
  where season.club_id = v_club_id
    and season.is_current = true;

  if v_season_id is null then
    raise exception using errcode = '22023', message = '현재 진행 중인 시즌이 없습니다.';
  end if;

  perform season_player.id
  from public.season_players as season_player
  where season_player.season_id = v_season_id
  order by season_player.current_rank
  for update;

  select season_player.current_rank, season_player.status
    into v_player1_rank, v_player1_status
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.player_id = p_player1_id;

  select season_player.current_rank, season_player.status
    into v_player2_rank, v_player2_status
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.player_id = p_player2_id;

  if v_player1_rank is null or v_player2_rank is null then
    raise exception using errcode = '22023', message = '현재 시즌의 선수를 찾을 수 없습니다.';
  end if;

  if v_player1_status <> 'active' or v_player2_status <> 'active' then
    raise exception using errcode = '22023', message = '활동 중인 선수끼리만 경기할 수 있습니다.';
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

  select
    rule.challenge_range,
    rule.rematch_cooldown_days
  into
    v_challenge_range,
    v_rematch_cooldown_days
  from public.rule_configs as rule
  where rule.club_id = v_club_id
    and rule.season_id = v_season_id;

  v_challenge_range := coalesce(v_challenge_range, 4);
  v_rematch_cooldown_days := coalesce(v_rematch_cooldown_days, 14);

  select count(*)::integer
    into v_active_distance
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.status = 'active'
    and season_player.current_rank > v_defender_rank
    and season_player.current_rank <= v_challenger_rank;

  if v_active_distance < 1 or v_active_distance > v_challenge_range then
    raise exception using errcode = '22023', message = '도전 가능한 순위 범위를 벗어났습니다.';
  end if;

  if exists (
    select 1
    from public.matches as previous_match
    where previous_match.season_id = v_season_id
      and previous_match.status = 'confirmed'
      and previous_match.played_on > p_played_on - v_rematch_cooldown_days
      and previous_match.played_on <= p_played_on
      and (
        (
          previous_match.challenger_player_id = p_player1_id
          and previous_match.defender_player_id = p_player2_id
        )
        or (
          previous_match.challenger_player_id = p_player2_id
          and previous_match.defender_player_id = p_player1_id
        )
      )
  ) then
    raise exception using errcode = '22023', message = '동일 선수와는 2주 동안 재경기할 수 없습니다.';
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

  v_rank_changed := v_winner_id = v_challenger_id;
  v_defense_result := case
    when v_rank_changed then '방어 실패'
    else '방어 성공'
  end;

  insert into public.matches (
    club_id,
    season_id,
    played_on,
    challenger_player_id,
    defender_player_id,
    challenger_rank_before,
    defender_rank_before,
    winner_player_id,
    loser_player_id,
    winner_score,
    loser_score,
    defense_result,
    source,
    source_key,
    status
  ) values (
    v_club_id,
    v_season_id,
    p_played_on,
    v_challenger_id,
    v_defender_id,
    v_challenger_rank,
    v_defender_rank,
    v_winner_id,
    v_loser_id,
    v_winner_score,
    v_loser_score,
    v_defense_result,
    'public_form',
    p_source_key,
    'confirmed'
  )
  returning id into v_match_id;

  if v_rank_changed then
    select max(season_player.current_rank) + 1000
      into v_temporary_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id;

    update public.season_players
    set current_rank = v_temporary_rank,
        updated_at = now()
    where season_id = v_season_id
      and player_id = v_challenger_id;

    for v_shifted_player in
      select season_player.id
      from public.season_players as season_player
      where season_player.season_id = v_season_id
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
    where season_id = v_season_id
      and player_id = v_challenger_id;
  end if;

  insert into public.ranking_events (
    club_id,
    season_id,
    event_type,
    actor_type,
    payload
  ) values (
    v_club_id,
    v_season_id,
    'match_recorded',
    'public',
    jsonb_build_object(
      'matchId', v_match_id,
      'sourceKey', p_source_key,
      'challengerPlayerId', v_challenger_id,
      'defenderPlayerId', v_defender_id,
      'winnerPlayerId', v_winner_id,
      'challengerRankBefore', v_challenger_rank,
      'defenderRankBefore', v_defender_rank,
      'rankChanged', v_rank_changed
    )
  );

  return jsonb_build_object(
    'matchId', v_match_id,
    'duplicate', false,
    'defenseResult', v_defense_result,
    'rankChanged', v_rank_changed
  );
end;
$$;

revoke execute on function public.record_public_match(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text
) from public, authenticated;

grant execute on function public.record_public_match(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text
) to anon, service_role;
