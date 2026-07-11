update public.season_players as season_player
set joined_at = season.starts_on::timestamp at time zone 'Asia/Seoul',
    updated_at = now()
from public.seasons as season
where season.id = season_player.season_id
  and season.starts_on is not null
  and season_player.joined_at = season_player.created_at
  and exists (
    select 1
    from public.season_players as import_batch
    where import_batch.season_id = season_player.season_id
      and import_batch.created_at = season_player.created_at
    group by import_batch.season_id, import_batch.created_at
    having count(*) >= 2
  )
  and not exists (
    select 1
    from public.ranking_events as ranking_event
    where ranking_event.season_id = season_player.season_id
      and ranking_event.event_type = 'player_added'
      and (
        ranking_event.payload ->> 'seasonPlayerId' = season_player.id::text
        or ranking_event.payload ->> 'playerId' = season_player.player_id::text
      )
  );
