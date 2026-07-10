create or replace function private.normalize_season_ranks(p_season_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offset integer;
  v_ranked record;
begin
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

  for v_ranked in
    select
      season_player.id,
      row_number() over (
        order by
          case when season_player.status = 'left' then 1 else 0 end,
          season_player.current_rank,
          season_player.id
      )::integer as next_rank
    from public.season_players as season_player
    where season_player.season_id = p_season_id
  loop
    update public.season_players
    set current_rank = v_ranked.next_rank,
        updated_at = now()
    where id = v_ranked.id;
  end loop;
end;
$$;

revoke all on function private.normalize_season_ranks(uuid)
from public, authenticated, anon;

create or replace function public.manage_admin_player_with_secret(
  p_action text,
  p_club_slug text,
  p_season_player_id uuid,
  p_name text,
  p_status text,
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
  v_player_id uuid;
  v_season_player_id uuid;
  v_name text;
  v_normalized_name text;
  v_old_name text;
  v_old_status text;
  v_old_rank integer;
  v_current_rank integer;
  v_initial_rank integer;
  v_event_type text;
  v_log_action text;
  v_payload jsonb;
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

  if p_action not in ('add', 'rename', 'status') then
    raise exception using errcode = '22023', message = '지원하지 않는 선수 관리 작업입니다.';
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

  if p_action = 'add' then
    v_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
    v_normalized_name := v_name;

    if char_length(v_name) < 1 or char_length(v_name) > 50 then
      raise exception using errcode = '22023', message = '선수 이름은 1자부터 50자까지 입력해주세요.';
    end if;

    select player.id
      into v_player_id
    from public.players as player
    where player.club_id = v_club_id
      and player.normalized_name = v_normalized_name;

    if v_player_id is not null and exists (
      select 1
      from public.season_players as season_player
      where season_player.season_id = v_season_id
        and season_player.player_id = v_player_id
    ) then
      raise exception using errcode = '23505', message = '이미 현재 시즌에 등록된 선수입니다.';
    end if;

    if v_player_id is null then
      insert into public.players (
        club_id,
        name,
        display_name,
        normalized_name
      ) values (
        v_club_id,
        v_name,
        v_name,
        v_normalized_name
      )
      returning id into v_player_id;
    else
      update public.players
      set name = v_name,
          display_name = v_name,
          updated_at = now()
      where id = v_player_id;
    end if;

    select count(*)::integer + 1
      into v_initial_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id
      and season_player.status <> 'left';

    select coalesce(max(season_player.current_rank), 0) + 1
      into v_current_rank
    from public.season_players as season_player
    where season_player.season_id = v_season_id;

    insert into public.season_players (
      club_id,
      season_id,
      player_id,
      initial_rank,
      current_rank,
      status
    ) values (
      v_club_id,
      v_season_id,
      v_player_id,
      v_initial_rank,
      v_current_rank,
      'active'
    )
    returning id into v_season_player_id;

    perform private.normalize_season_ranks(v_season_id);

    select season_player.current_rank
      into v_current_rank
    from public.season_players as season_player
    where season_player.id = v_season_player_id;

    v_event_type := 'player_added';
    v_log_action := 'add_player';
    v_payload := jsonb_build_object(
      'seasonPlayerId', v_season_player_id,
      'playerId', v_player_id,
      'name', v_name,
      'rank', v_current_rank,
      'status', 'active'
    );
  else
    select
      season_player.player_id,
      season_player.id,
      player.display_name,
      season_player.status,
      season_player.current_rank
    into
      v_player_id,
      v_season_player_id,
      v_old_name,
      v_old_status,
      v_old_rank
    from public.season_players as season_player
    join public.players as player on player.id = season_player.player_id
    where season_player.id = p_season_player_id
      and season_player.club_id = v_club_id
      and season_player.season_id = v_season_id
    for update of season_player, player;

    if v_season_player_id is null then
      raise exception using errcode = '22023', message = '현재 시즌의 선수를 찾지 못했습니다.';
    end if;

    if p_action = 'rename' then
      v_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
      v_normalized_name := v_name;

      if char_length(v_name) < 1 or char_length(v_name) > 50 then
        raise exception using errcode = '22023', message = '선수 이름은 1자부터 50자까지 입력해주세요.';
      end if;

      if exists (
        select 1
        from public.players as duplicate_player
        where duplicate_player.club_id = v_club_id
          and duplicate_player.normalized_name = v_normalized_name
          and duplicate_player.id <> v_player_id
      ) then
        raise exception using errcode = '23505', message = '같은 이름의 선수가 이미 등록되어 있습니다.';
      end if;

      update public.players
      set name = v_name,
          display_name = v_name,
          normalized_name = v_normalized_name,
          updated_at = now()
      where id = v_player_id;

      v_current_rank := v_old_rank;
      v_event_type := 'player_renamed';
      v_log_action := 'rename_player';
      v_payload := jsonb_build_object(
        'seasonPlayerId', v_season_player_id,
        'playerId', v_player_id,
        'oldName', v_old_name,
        'name', v_name,
        'rank', v_current_rank,
        'status', v_old_status
      );
    else
      if p_status not in ('active', 'injured', 'inactive', 'left') then
        raise exception using errcode = '22023', message = '선수 상태가 올바르지 않습니다.';
      end if;

      update public.season_players
      set status = p_status,
          left_at = case when p_status = 'left' then now() else null end,
          updated_at = now()
      where id = v_season_player_id;

      perform private.normalize_season_ranks(v_season_id);

      select season_player.current_rank
        into v_current_rank
      from public.season_players as season_player
      where season_player.id = v_season_player_id;

      v_name := v_old_name;
      v_event_type := 'player_status_changed';
      v_log_action := 'change_player_status';
      v_payload := jsonb_build_object(
        'seasonPlayerId', v_season_player_id,
        'playerId', v_player_id,
        'name', v_name,
        'oldStatus', v_old_status,
        'status', p_status,
        'oldRank', v_old_rank,
        'rank', v_current_rank
      );
    end if;
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
    v_event_type,
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
    v_log_action,
    'season_players',
    v_season_player_id,
    v_payload
  );

  return jsonb_build_object(
    'action', p_action,
    'seasonPlayerId', v_season_player_id,
    'playerId', v_player_id,
    'name', v_name,
    'rank', v_current_rank,
    'status', case when p_action = 'status' then p_status else coalesce(v_old_status, 'active') end
  );
end;
$$;

revoke execute on function public.manage_admin_player_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text
) from public, authenticated, anon;

grant execute on function public.manage_admin_player_with_secret(
  text,
  text,
  uuid,
  text,
  text,
  text
) to anon, service_role;
