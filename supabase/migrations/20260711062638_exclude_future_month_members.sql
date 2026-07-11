alter table public.monthly_settlements
  add column if not exists match_counts jsonb not null default '{}'::jsonb;

create or replace function private.ensure_unique_season_player_initial_rank()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.season_players as season_player
    where season_player.season_id = new.season_id
      and season_player.initial_rank = new.initial_rank
  ) then
    select coalesce(max(season_player.initial_rank) + 1, 1)
      into new.initial_rank
    from public.season_players as season_player
    where season_player.season_id = new.season_id;
  end if;

  return new;
end;
$$;

revoke all on function private.ensure_unique_season_player_initial_rank()
from public, authenticated, anon;

-- Older application versions could reuse an initial rank after a player left.
-- Keep the earliest row in place and move only duplicate rows to the end.
with ranked_initial_ranks as (
  select
    season_player.id,
    season_player.season_id,
    season_player.initial_rank,
    season_player.joined_at,
    row_number() over (
      partition by season_player.season_id, season_player.initial_rank
      order by season_player.joined_at, season_player.id
    ) as duplicate_position,
    max(season_player.initial_rank) over (
      partition by season_player.season_id
    ) as max_initial_rank
  from public.season_players as season_player
),
duplicate_repairs as (
  select
    ranked_initial_ranks.id,
    ranked_initial_ranks.max_initial_rank
      + row_number() over (
          partition by ranked_initial_ranks.season_id
          order by
            ranked_initial_ranks.initial_rank,
            ranked_initial_ranks.joined_at,
            ranked_initial_ranks.id
        ) as repaired_initial_rank
  from ranked_initial_ranks
  where ranked_initial_ranks.duplicate_position > 1
)
update public.season_players as season_player
set initial_rank = duplicate_repairs.repaired_initial_rank,
    updated_at = now()
from duplicate_repairs
where season_player.id = duplicate_repairs.id;

create unique index if not exists season_players_season_initial_rank_key
  on public.season_players (season_id, initial_rank);

drop trigger if exists ensure_unique_season_player_initial_rank
  on public.season_players;

create trigger ensure_unique_season_player_initial_rank
before insert on public.season_players
for each row
execute function private.ensure_unique_season_player_initial_rank();

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
  v_match_counts jsonb;
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
    and season_player.status <> 'left'
    and season_player.joined_at < (
      v_target_month_end::timestamp at time zone 'Asia/Seoul'
    );

  select coalesce(
    array_agg(season_player.player_id order by season_player.current_rank),
    '{}'::uuid[]
  )
    into v_target_player_ids
  from public.season_players as season_player
  where season_player.season_id = v_season_id
    and season_player.status <> 'left'
    and season_player.joined_at < (
      v_target_month_end::timestamp at time zone 'Asia/Seoul'
    )
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
    jsonb_object_agg(
      player_match_count.player_id::text,
      player_match_count.match_count
    ),
    '{}'::jsonb
  )
    into v_match_counts
  from (
    select
      season_player.player_id,
      count(match_row.id)::integer as match_count
    from public.season_players as season_player
    left join public.matches as match_row
      on match_row.season_id = v_season_id
      and match_row.status = 'confirmed'
      and match_row.played_on >= p_target_month
      and match_row.played_on < v_target_month_end
      and season_player.player_id in (
        match_row.challenger_player_id,
        match_row.defender_player_id
      )
    where season_player.season_id = v_season_id
      and season_player.player_id = any(v_eligible_player_ids)
    group by season_player.player_id
  ) as player_match_count;

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
    match_counts,
    rank_before
  ) values (
    v_club_id,
    v_season_id,
    p_target_month,
    v_penalty_drop,
    v_eligible_player_ids,
    v_target_player_ids,
    v_match_counts,
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
      'matchCounts', v_match_counts,
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
      'targetPlayerIds', to_jsonb(v_target_player_ids),
      'matchCounts', v_match_counts
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

    if exists (
      select 1
      from public.monthly_settlements as settlement
      where settlement.season_id = v_season_id
        and p_played_on < (settlement.target_month + interval '1 month')::date
    ) then
      raise exception using
        errcode = '22023',
        message = '이미 월간 정산이 적용된 기간의 경기는 입력할 수 없습니다.';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      coalesce(p_club_slug, '') || ':' || p_source_key,
      0
    )
  );

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
