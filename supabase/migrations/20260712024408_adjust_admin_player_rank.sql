alter function public.manage_admin_player_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text
) rename to manage_admin_player_base_with_secret;

alter function public.manage_admin_player_base_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text
) set schema private;

revoke all on function private.manage_admin_player_base_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text
) from public, authenticated, anon;

create function public.manage_admin_player_with_secret(
  p_action text,
  p_club_slug text,
  p_season_player_id uuid,
  p_name text,
  p_status text,
  p_admin_secret text,
  p_target_rank integer default null
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
  v_player_id uuid;
  v_season_player_id uuid;
  v_player_name text;
  v_old_status text;
  v_old_rank integer;
  v_ranked_player_count integer;
  v_rank_offset integer;
  v_interval_start integer;
  v_interval_end integer;
  v_changes jsonb;
  v_payload jsonb;
begin
  if p_action not in ('add', 'rename', 'status', 'rank') then
    raise exception using errcode = '22023', message = '지원하지 않는 선수 관리 작업입니다.';
  end if;

  if p_action <> 'rank' then
    return private.manage_admin_player_base_with_secret(
      p_action,
      p_club_slug,
      p_season_player_id,
      p_name,
      p_status,
      p_admin_secret
    );
  end if;

  select app_secret.secret_hash
    into v_secret_hash
  from private.app_secrets as app_secret
  where app_secret.name = 'admin_write';

  if v_secret_hash is null
    or p_admin_secret is null
    or extensions.crypt(p_admin_secret, v_secret_hash) <> v_secret_hash then
    raise exception using errcode = '42501', message = '관리자 비밀키가 올바르지 않습니다.';
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

  perform season_player.id
  from public.season_players as season_player
  where season_player.season_id = v_season_id
  order by season_player.current_rank
  for update;

  select
    season_player.player_id,
    season_player.id,
    player.display_name,
    season_player.status,
    season_player.current_rank
  into
    v_player_id,
    v_season_player_id,
    v_player_name,
    v_old_status,
    v_old_rank
  from public.season_players as season_player
  join public.players as player on player.id = season_player.player_id
  where season_player.id = p_season_player_id
    and season_player.club_id = v_club_id
    and season_player.season_id = v_season_id;

  if v_season_player_id is null then
    raise exception using errcode = '22023', message = '현재 시즌의 선수를 찾지 못했습니다.';
  end if;

  if v_old_status = 'left' then
    raise exception using errcode = '22023', message = '탈퇴한 선수의 순위는 변경할 수 없습니다.';
  end if;

  select count(*)::integer
    into v_ranked_player_count
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.status <> 'left';

  if p_target_rank is null
    or p_target_rank < 1
    or p_target_rank > v_ranked_player_count then
    raise exception using errcode = '22023', message = '목표 순위가 현재 선수 범위를 벗어났습니다.';
  end if;

  if p_target_rank = v_old_rank then
    raise exception using errcode = '22023', message = '현재 순위와 다른 목표 순위를 선택해주세요.';
  end if;

  v_interval_start := least(v_old_rank, p_target_rank);
  v_interval_end := greatest(v_old_rank, p_target_rank);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'seasonPlayerId', affected.id,
        'name', affected.name,
        'oldRank', affected.old_rank,
        'newRank', affected.new_rank
      )
      order by
        case when affected.id = v_season_player_id then 0 else 1 end,
        affected.old_rank
    ),
    '[]'::jsonb
  )
    into v_changes
  from (
    select
      season_player.id,
      player.display_name as name,
      season_player.current_rank as old_rank,
      case
        when season_player.id = v_season_player_id then p_target_rank
        when p_target_rank < v_old_rank then season_player.current_rank + 1
        else season_player.current_rank - 1
      end as new_rank
    from public.season_players as season_player
    join public.players as player on player.id = season_player.player_id
    where season_player.season_id = v_season_id
      and season_player.current_rank between v_interval_start and v_interval_end
  ) as affected;

  select coalesce(max(season_player.current_rank), 0)
       + count(*)::integer
       + 1000
    into v_rank_offset
  from public.season_players as season_player
  where season_player.season_id = v_season_id;

  update public.season_players
  set current_rank = current_rank + v_rank_offset,
      updated_at = now()
  where season_id = v_season_id
    and current_rank between v_interval_start and v_interval_end;

  with affected_ranks as (
    select
      season_player.id,
      season_player.current_rank - v_rank_offset as original_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id
      and season_player.current_rank between
        v_interval_start + v_rank_offset
        and v_interval_end + v_rank_offset
  )
  update public.season_players as season_player
  set current_rank = case
        when season_player.id = v_season_player_id then p_target_rank
        when p_target_rank < v_old_rank then affected_ranks.original_rank + 1
        when p_target_rank > v_old_rank then affected_ranks.original_rank - 1
      end,
      updated_at = now()
  from affected_ranks
  where season_player.id = affected_ranks.id;

  v_payload := jsonb_build_object(
    'seasonPlayerId', v_season_player_id,
    'playerId', v_player_id,
    'name', v_player_name,
    'oldRank', v_old_rank,
    'rank', p_target_rank,
    'status', v_old_status,
    'changes', v_changes
  );

  insert into public.ranking_events (
    club_id,
    season_id,
    event_type,
    actor_type,
    payload
  ) values (
    v_club_id,
    v_season_id,
    'admin_rank_adjusted',
    'admin',
    v_payload
  );

  insert into public.admin_action_logs (
    club_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_club_id,
    'change_rank',
    'season_players',
    v_season_player_id,
    v_payload
  );

  return jsonb_build_object(
    'action', 'rank',
    'seasonPlayerId', v_season_player_id,
    'playerId', v_player_id,
    'name', v_player_name,
    'oldRank', v_old_rank,
    'rank', p_target_rank,
    'status', v_old_status,
    'changes', v_changes
  );
end;
$$;

revoke execute on function public.manage_admin_player_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer
) from public, authenticated, anon;

grant execute on function public.manage_admin_player_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer
) to anon, service_role;
