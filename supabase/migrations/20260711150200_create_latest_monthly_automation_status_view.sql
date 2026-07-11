create or replace function private.capture_monthly_settlement_automation_run()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_public_message text;
  v_season_id_text text;
  v_target_month_text text;
  v_season_id uuid;
  v_settlement_id uuid;
  v_error_code text;
begin
  if new.action = 'automatic_monthly_inactivity_penalty_applied' then
    v_status := 'succeeded';
    v_public_message := '자동 정산을 완료했습니다.';
  elsif new.action = 'automatic_monthly_inactivity_penalty_skipped' then
    v_status := 'skipped';
    v_public_message := '이미 정산되어 건너뛰었습니다.';
  elsif new.action = 'automatic_monthly_inactivity_penalty_failed' then
    v_status := 'failed';
    v_public_message :=
      '자동 정산에 실패했습니다. 미리보기에서 수동 정산을 확인해주세요.';
  else
    return new;
  end if;

  v_season_id_text := new.payload ->> 'seasonId';
  v_target_month_text := new.payload ->> 'targetMonth';

  if new.club_id is null
    or v_season_id_text is null
    or v_season_id_text !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or v_target_month_text is null
    or v_target_month_text !~
      '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then
    return new;
  end if;

  select season.id
    into v_season_id
  from public.seasons as season
  where season.id::text = lower(v_season_id_text)
    and season.club_id = new.club_id;

  if v_season_id is null then
    return new;
  end if;

  select settlement.id
    into v_settlement_id
  from public.monthly_settlements as settlement
  where settlement.id = new.target_id
    and settlement.season_id = v_season_id;

  v_error_code := case
    when new.payload ->> 'errorCode' ~ '^[0-9A-Z]{5}$'
      then new.payload ->> 'errorCode'
    else null
  end;

  insert into public.monthly_settlement_automation_runs (
    admin_action_log_id,
    club_id,
    season_id,
    target_month,
    status,
    settlement_id,
    error_code,
    public_message,
    executed_at
  ) values (
    new.id,
    new.club_id,
    v_season_id,
    (v_target_month_text || '-01')::date,
    v_status,
    v_settlement_id,
    v_error_code,
    v_public_message,
    new.created_at
  )
  on conflict (admin_action_log_id) do nothing;

  return new;
exception
  when others then
    return new;
end;
$$;

revoke all on function private.capture_monthly_settlement_automation_run()
from public, authenticated, anon;

create or replace view public.latest_monthly_settlement_automation_runs
with (security_invoker = true)
as
select distinct on (automation_run.club_id)
  automation_run.id,
  automation_run.admin_action_log_id,
  automation_run.club_id,
  automation_run.season_id,
  automation_run.target_month,
  automation_run.status,
  automation_run.settlement_id,
  automation_run.error_code,
  automation_run.public_message,
  automation_run.executed_at
from public.monthly_settlement_automation_runs as automation_run
order by
  automation_run.club_id,
  automation_run.executed_at desc,
  automation_run.id desc;

revoke all on public.latest_monthly_settlement_automation_runs
from public, anon, authenticated;

grant select on public.latest_monthly_settlement_automation_runs to anon;
grant select on public.latest_monthly_settlement_automation_runs
to service_role;
