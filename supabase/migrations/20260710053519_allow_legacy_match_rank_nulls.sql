alter table public.matches
  alter column challenger_rank_before drop not null,
  alter column defender_rank_before drop not null;
