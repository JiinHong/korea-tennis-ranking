create policy "Service role can manage ranking events" on public.ranking_events
  for all to service_role
  using (true)
  with check (true);

create policy "Service role can manage admin action logs" on public.admin_action_logs
  for all to service_role
  using (true)
  with check (true);

create index if not exists admin_action_logs_club_id_idx
  on public.admin_action_logs (club_id);

create index if not exists injury_periods_club_id_idx
  on public.injury_periods (club_id);

create index if not exists injury_periods_season_id_idx
  on public.injury_periods (season_id);

create index if not exists injury_periods_player_id_idx
  on public.injury_periods (player_id);

create index if not exists matches_club_id_idx
  on public.matches (club_id);

create index if not exists matches_season_id_idx
  on public.matches (season_id);

create index if not exists matches_challenger_player_id_idx
  on public.matches (challenger_player_id);

create index if not exists matches_defender_player_id_idx
  on public.matches (defender_player_id);

create index if not exists matches_winner_player_id_idx
  on public.matches (winner_player_id);

create index if not exists matches_loser_player_id_idx
  on public.matches (loser_player_id);

create index if not exists matches_season_played_on_idx
  on public.matches (season_id, played_on desc);

create index if not exists ranking_events_club_id_idx
  on public.ranking_events (club_id);

create index if not exists ranking_events_season_id_idx
  on public.ranking_events (season_id);

create index if not exists rule_configs_season_id_idx
  on public.rule_configs (season_id);

create index if not exists season_players_club_id_idx
  on public.season_players (club_id);

create index if not exists season_players_player_id_idx
  on public.season_players (player_id);
