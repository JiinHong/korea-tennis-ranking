alter table public.national_clubs
  drop constraint if exists national_clubs_club_name_check;

alter table public.national_clubs
  add constraint national_clubs_club_name_check
  check (club_name = '' or btrim(club_name) <> '');
