create index if not exists match_ranking_movements_club_id_idx
  on public.match_ranking_movements (club_id);

create index if not exists match_ranking_movements_player_id_idx
  on public.match_ranking_movements (player_id);
