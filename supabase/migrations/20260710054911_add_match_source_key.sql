alter table public.matches
  add column if not exists source_key text;

create unique index if not exists matches_club_source_key_idx
  on public.matches (club_id, source_key)
  where source_key is not null;
