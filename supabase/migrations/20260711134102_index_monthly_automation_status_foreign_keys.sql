create index if not exists monthly_settlement_automation_runs_season_id_idx
  on public.monthly_settlement_automation_runs (season_id);

create index if not exists monthly_settlement_automation_runs_settlement_id_idx
  on public.monthly_settlement_automation_runs (settlement_id);
