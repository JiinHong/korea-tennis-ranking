create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.apply_monthly_inactivity_penalty(
  p_club_slug text,
  p_target_month date,
  p_actor_type text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
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
  v_admin_action text;
begin
  if p_actor_type is null or p_actor_type not in ('admin', 'system') then
    raise exception using
      errcode = '22023',
      message = '정산 실행 주체가 올바르지 않습니다.';
  end if;

  if p_target_month is null
    or p_target_month <> date_trunc('month', p_target_month)::date then
    raise exception using
      errcode = '22023',
      message = '정산 월은 해당 월의 1일이어야 합니다.';
  end if;

  select club.id
    into v_club_id
  from public.clubs as club
  where club.slug = p_club_slug
    and club.is_active = true;

  if v_club_id is null then
    raise exception using
      errcode = '22023',
      message = '등록되지 않은 동아리입니다.';
  end if;

  select season.id, season.starts_on, season.ends_on
    into v_season_id, v_season_start, v_season_end
  from public.seasons as season
  where season.club_id = v_club_id
    and season.is_current = true
  for update;

  if v_season_id is null then
    raise exception using
      errcode = '22023',
      message = '현재 진행 중인 시즌이 없습니다.';
  end if;

  if v_season_start is null then
    raise exception using
      errcode = '22023',
      message = '시즌 시작일이 설정되지 않았습니다.';
  end if;

  v_current_month_start := date_trunc(
    'month',
    now() at time zone 'Asia/Seoul'
  )::date;
  v_target_month_end := (p_target_month + interval '1 month')::date;

  if v_target_month_end > v_current_month_start then
    raise exception using
      errcode = '22023',
      message = '완료된 월만 정산할 수 있습니다.';
  end if;

  if p_target_month < date_trunc('month', v_season_start)::date
    or (
      v_season_end is not null
      and p_target_month > date_trunc('month', v_season_end)::date
    ) then
    raise exception using
      errcode = '22023',
      message = '시즌 기간에 포함되지 않는 월입니다.';
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
    raise exception using
      errcode = '23505',
      message = '이미 정산이 완료된 월입니다.';
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
    p_actor_type,
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

  v_admin_action := case
    when p_actor_type = 'system'
      then 'automatic_monthly_inactivity_penalty_applied'
    else 'apply_monthly_inactivity_penalty'
  end;

  insert into public.admin_action_logs (
    club_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_club_id,
    v_admin_action,
    'monthly_settlements',
    v_settlement_id,
    jsonb_build_object(
      'seasonId', v_season_id,
      'targetMonth', to_char(p_target_month, 'YYYY-MM'),
      'penaltyDrop', v_penalty_drop,
      'targetPlayerIds', to_jsonb(v_target_player_ids),
      'matchCounts', v_match_counts,
      'actorType', p_actor_type
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

revoke all on function private.apply_monthly_inactivity_penalty(
  text,
  date,
  text
)
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
begin
  select app_secret.secret_hash
    into v_secret_hash
  from private.app_secrets as app_secret
  where app_secret.name = 'admin_write';

  if v_secret_hash is null
    or p_admin_secret is null
    or extensions.crypt(p_admin_secret, v_secret_hash) <> v_secret_hash then
    raise exception using
      errcode = '42501',
      message = '관리자 비밀키가 올바르지 않습니다.';
  end if;

  return private.apply_monthly_inactivity_penalty(
    p_club_slug,
    p_target_month,
    'admin'
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

create or replace function private.run_monthly_inactivity_settlements(
  p_run_at timestamptz default now()
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_seoul_timestamp timestamp;
  v_target_month date;
  v_existing_settlement_id uuid;
  v_result jsonb;
  v_succeeded integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;
  v_error_code text;
  v_error_message text;
  season_record record;
begin
  if p_run_at is null then
    raise exception using
      errcode = '22023',
      message = '자동 정산 실행 시각이 필요합니다.';
  end if;

  v_seoul_timestamp := p_run_at at time zone 'Asia/Seoul';

  if extract(day from v_seoul_timestamp) <> 1 then
    return jsonb_build_object(
      'status', 'not_due',
      'seoulDate', to_char(v_seoul_timestamp, 'YYYY-MM-DD')
    );
  end if;

  v_target_month := (
    date_trunc('month', v_seoul_timestamp)::date - interval '1 month'
  )::date;

  for season_record in
    select
      club.id as club_id,
      club.slug as club_slug,
      season.id as season_id
    from public.clubs as club
    join public.seasons as season on season.club_id = club.id
    where club.is_active = true
      and season.is_current = true
      and season.starts_on is not null
      and v_target_month >= date_trunc('month', season.starts_on)::date
      and (
        season.ends_on is null
        or v_target_month <= date_trunc('month', season.ends_on)::date
      )
    order by club.slug
  loop
    begin
      select settlement.id
        into v_existing_settlement_id
      from public.monthly_settlements as settlement
      where settlement.season_id = season_record.season_id
        and settlement.target_month = v_target_month;

      if v_existing_settlement_id is not null then
        v_skipped := v_skipped + 1;

        insert into public.admin_action_logs (
          club_id,
          action,
          target_table,
          target_id,
          payload
        ) values (
          season_record.club_id,
          'automatic_monthly_inactivity_penalty_skipped',
          'monthly_settlements',
          v_existing_settlement_id,
          jsonb_build_object(
            'seasonId', season_record.season_id,
            'targetMonth', to_char(v_target_month, 'YYYY-MM'),
            'reason', 'already_settled'
          )
        );

        continue;
      end if;

      v_result := private.apply_monthly_inactivity_penalty(
        season_record.club_slug,
        v_target_month,
        'system'
      );
      v_succeeded := v_succeeded + 1;
    exception
      when unique_violation then
        get stacked diagnostics
          v_error_code = returned_sqlstate,
          v_error_message = message_text;
        v_existing_settlement_id := null;

        select settlement.id
          into v_existing_settlement_id
        from public.monthly_settlements as settlement
        where settlement.season_id = season_record.season_id
          and settlement.target_month = v_target_month;

        if v_existing_settlement_id is null then
          v_failed := v_failed + 1;

          insert into public.admin_action_logs (
            club_id,
            action,
            target_table,
            payload
          ) values (
            season_record.club_id,
            'automatic_monthly_inactivity_penalty_failed',
            'monthly_settlements',
            jsonb_build_object(
              'seasonId', season_record.season_id,
              'targetMonth', to_char(v_target_month, 'YYYY-MM'),
              'errorCode', v_error_code,
              'errorMessage', v_error_message
            )
          );
        else
          v_skipped := v_skipped + 1;

          insert into public.admin_action_logs (
            club_id,
            action,
            target_table,
            target_id,
            payload
          ) values (
            season_record.club_id,
            'automatic_monthly_inactivity_penalty_skipped',
            'monthly_settlements',
            v_existing_settlement_id,
            jsonb_build_object(
              'seasonId', season_record.season_id,
              'targetMonth', to_char(v_target_month, 'YYYY-MM'),
              'reason', 'concurrent_settlement'
            )
          );
        end if;
      when others then
        get stacked diagnostics
          v_error_code = returned_sqlstate,
          v_error_message = message_text;
        v_failed := v_failed + 1;

        insert into public.admin_action_logs (
          club_id,
          action,
          target_table,
          payload
        ) values (
          season_record.club_id,
          'automatic_monthly_inactivity_penalty_failed',
          'monthly_settlements',
          jsonb_build_object(
            'seasonId', season_record.season_id,
            'targetMonth', to_char(v_target_month, 'YYYY-MM'),
            'errorCode', v_error_code,
            'errorMessage', v_error_message
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'status', 'completed',
    'targetMonth', to_char(v_target_month, 'YYYY-MM'),
    'succeeded', v_succeeded,
    'skipped', v_skipped,
    'failed', v_failed
  );
end;
$$;

revoke all on function private.run_monthly_inactivity_settlements(timestamptz)
from public, authenticated, anon;

select cron.schedule(
  'monthly-inactivity-settlement',
  '10 15 28-31 * *',
  $cron$select private.run_monthly_inactivity_settlements();$cron$
);
