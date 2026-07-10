alter table public.players
  add column if not exists club_id uuid references public.clubs(id) on delete cascade;

alter table public.players
  add column if not exists normalized_name text;

update public.players
set normalized_name = regexp_replace(btrim(name), '\s+', ' ', 'g')
where normalized_name is null;

create unique index if not exists players_club_normalized_name_idx
  on public.players (club_id, normalized_name)
  where club_id is not null and normalized_name is not null;

create index if not exists players_club_id_idx
  on public.players (club_id);
