drop table if exists public.injury_periods;

alter table public.rule_configs
  drop column if exists injury_exemption_limit,
  drop column if exists injury_notice_deadline_days_before_month_end;
