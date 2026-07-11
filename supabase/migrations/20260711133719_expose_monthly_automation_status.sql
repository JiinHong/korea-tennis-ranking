create table if not exists public.monthly_settlement_automation_runs (
  id uuid primary key default gen_random_uuid(),
  admin_action_log_id uuid not null unique
    references public.admin_action_logs(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  target_month date not null
    check (target_month = date_trunc('month', target_month)::date),
  status text not null check (status in ('succeeded', 'skipped', 'failed')),
  settlement_id uuid references public.monthly_settlements(id) on delete set null,
  error_code text check (
    error_code is null or error_code ~ '^[0-9A-Z]{5}$'
  ),
  public_message text not null,
  executed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists monthly_settlement_automation_runs_club_time_idx
  on public.monthly_settlement_automation_runs (club_id, executed_at desc);

alter table public.monthly_settlement_automation_runs enable row level security;

drop policy if exists "Public can read monthly settlement automation runs"
  on public.monthly_settlement_automation_runs;

create policy "Public can read monthly settlement automation runs"
  on public.monthly_settlement_automation_runs
  for select to anon
  using (true);

revoke all on table public.monthly_settlement_automation_runs
from public, anon, authenticated;

grant select on public.monthly_settlement_automation_runs to anon;

grant select, insert, update, delete
on public.monthly_settlement_automation_runs to service_role;

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
    or v_target_month_text !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then
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

drop trigger if exists capture_monthly_settlement_automation_run
  on public.admin_action_logs;

create trigger capture_monthly_settlement_automation_run
after insert on public.admin_action_logs
for each row
execute function private.capture_monthly_settlement_automation_run();

with candidate_logs as (
  select
    action_log.*,
    case
      when action_log.payload ->> 'targetMonth' ~
        '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$'
        then ((action_log.payload ->> 'targetMonth') || '-01')::date
      else null
    end as sanitized_target_month,
    case
      when action_log.payload ->> 'errorCode' ~ '^[0-9A-Z]{5}$'
        then action_log.payload ->> 'errorCode'
      else null
    end as sanitized_error_code
  from public.admin_action_logs as action_log
  where action_log.action in (
    'automatic_monthly_inactivity_penalty_applied',
    'automatic_monthly_inactivity_penalty_skipped',
    'automatic_monthly_inactivity_penalty_failed'
  )
)
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
)
select
  action_log.id,
  action_log.club_id,
  season.id,
  action_log.sanitized_target_month,
  case action_log.action
    when 'automatic_monthly_inactivity_penalty_applied' then 'succeeded'
    when 'automatic_monthly_inactivity_penalty_skipped' then 'skipped'
    else 'failed'
  end,
  settlement.id,
  action_log.sanitized_error_code,
  case action_log.action
    when 'automatic_monthly_inactivity_penalty_applied'
      then '자동 정산을 완료했습니다.'
    when 'automatic_monthly_inactivity_penalty_skipped'
      then '이미 정산되어 건너뛰었습니다.'
    else
      '자동 정산에 실패했습니다. 미리보기에서 수동 정산을 확인해주세요.'
  end,
  action_log.created_at
from candidate_logs as action_log
join public.seasons as season
  on season.id::text = lower(action_log.payload ->> 'seasonId')
  and season.club_id = action_log.club_id
left join public.monthly_settlements as settlement
  on settlement.id = action_log.target_id
  and settlement.season_id = season.id
where action_log.club_id is not null
  and action_log.sanitized_target_month is not null
on conflict (admin_action_log_id) do nothing;
