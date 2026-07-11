create or replace function public.record_public_match_with_secret(
  p_club_slug text,
  p_player1_id uuid,
  p_player2_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_played_on date,
  p_source_key text,
  p_write_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_season_id uuid;
  v_result jsonb;
  v_match public.matches%rowtype;
begin
  select app_secret.secret_hash
    into v_secret_hash
  from private.app_secrets as app_secret
  where app_secret.name = 'public_match_write';

  if v_secret_hash is null
    or p_write_secret is null
    or extensions.crypt(p_write_secret, v_secret_hash) <> v_secret_hash then
    raise exception using errcode = '42501', message = '경기 저장 권한을 확인하지 못했습니다.';
  end if;

  if p_source_key is null or btrim(p_source_key) = '' then
    raise exception using errcode = '22023', message = '제출 식별값이 필요합니다.';
  end if;

  select season.id
    into v_season_id
  from public.seasons as season
  join public.clubs as club on club.id = season.club_id
  where club.slug = p_club_slug
    and club.is_active = true
    and season.is_current = true;

  if v_season_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('season-ranking:' || v_season_id::text, 0)
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      coalesce(p_club_slug, '') || ':' || p_source_key,
      0
    )
  );

  select match_row.*
    into v_match
  from public.matches as match_row
  join public.clubs as club on club.id = match_row.club_id
  where club.slug = p_club_slug
    and match_row.source_key = p_source_key
  limit 1;

  if v_match.id is not null then
    return jsonb_build_object(
      'matchId', v_match.id,
      'duplicate', true,
      'defenseResult', v_match.defense_result,
      'rankChanged', v_match.defense_result = '방어 실패'
    );
  end if;

  if v_season_id is not null and exists (
    select 1
    from public.monthly_settlements as settlement
    where settlement.season_id = v_season_id
      and p_played_on < (settlement.target_month + interval '1 month')::date
  ) then
    raise exception using
      errcode = '22023',
      message = '이미 월간 정산이 적용된 기간의 경기는 입력할 수 없습니다.';
  end if;

  v_result := public.record_public_match(
    p_club_slug,
    p_player1_id,
    p_player2_id,
    p_player1_score,
    p_player2_score,
    p_played_on,
    p_source_key
  );

  if coalesce((v_result ->> 'duplicate')::boolean, false) then
    return v_result;
  end if;

  select match_row.*
    into v_match
  from public.matches as match_row
  where match_row.id = (v_result ->> 'matchId')::uuid;

  perform private.recalculate_season_rankings(v_match.season_id);

  select match_row.*
    into v_match
  from public.matches as match_row
  where match_row.id = v_match.id;

  update public.ranking_events as ranking_event
  set payload = ranking_event.payload || jsonb_build_object(
    'challengerPlayerId', v_match.challenger_player_id,
    'defenderPlayerId', v_match.defender_player_id,
    'challengerRankBefore', v_match.challenger_rank_before,
    'defenderRankBefore', v_match.defender_rank_before,
    'rankChanged', v_match.defense_result = '방어 실패'
  )
  where ranking_event.season_id = v_match.season_id
    and ranking_event.event_type = 'match_recorded'
    and ranking_event.payload ->> 'matchId' = v_match.id::text;

  return jsonb_build_object(
    'matchId', v_match.id,
    'duplicate', false,
    'defenseResult', v_match.defense_result,
    'rankChanged', v_match.defense_result = '방어 실패'
  );
end;
$$;

revoke execute on function public.record_public_match_with_secret(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text,
  text
)
from public, authenticated, anon;

grant execute on function public.record_public_match_with_secret(
  text,
  uuid,
  uuid,
  integer,
  integer,
  date,
  text,
  text
)
to anon, service_role;
