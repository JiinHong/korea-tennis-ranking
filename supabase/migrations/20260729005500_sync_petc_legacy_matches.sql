do $migration$
declare
  v_club_id uuid;
  v_season_id uuid;
  v_expected_ranking jsonb := '[
    {"rank":1,"name":"박준형"},
    {"rank":2,"name":"문준상"},
    {"rank":3,"name":"정혁진"},
    {"rank":4,"name":"알료나"},
    {"rank":5,"name":"김진하"},
    {"rank":6,"name":"이신영"},
    {"rank":7,"name":"윤준필"},
    {"rank":8,"name":"권현준"},
    {"rank":9,"name":"김상원"},
    {"rank":10,"name":"김만기"},
    {"rank":11,"name":"안치성"},
    {"rank":12,"name":"한가진"},
    {"rank":13,"name":"유인화"},
    {"rank":14,"name":"유잉걸"},
    {"rank":15,"name":"신명"},
    {"rank":16,"name":"서준호"},
    {"rank":17,"name":"이민후"},
    {"rank":18,"name":"조성흠"},
    {"rank":19,"name":"임은서"},
    {"rank":20,"name":"최윤범"},
    {"rank":21,"name":"민수홍"},
    {"rank":22,"name":"전윤호"},
    {"rank":23,"name":"안진우"},
    {"rank":24,"name":"진동하"},
    {"rank":25,"name":"유현지"},
    {"rank":26,"name":"염철웅"},
    {"rank":27,"name":"이제용"},
    {"rank":28,"name":"전하영"},
    {"rank":29,"name":"이상헌"},
    {"rank":30,"name":"정연수"},
    {"rank":31,"name":"김서현"},
    {"rank":32,"name":"김두림"},
    {"rank":33,"name":"김용관"},
    {"rank":34,"name":"최영찬"},
    {"rank":35,"name":"최자윤"},
    {"rank":36,"name":"서민웅"},
    {"rank":37,"name":"김은수"},
    {"rank":38,"name":"김하윤"},
    {"rank":39,"name":"임규연"},
    {"rank":40,"name":"원종현"},
    {"rank":41,"name":"이동혁"},
    {"rank":42,"name":"김시완"},
    {"rank":43,"name":"전하랑"},
    {"rank":44,"name":"박희진"},
    {"rank":45,"name":"신민수"},
    {"rank":46,"name":"백지은"},
    {"rank":47,"name":"김주완"},
    {"rank":48,"name":"현승윤"},
    {"rank":49,"name":"윤요한"},
    {"rank":50,"name":"고은수"},
    {"rank":51,"name":"윤용제"},
    {"rank":52,"name":"손민준"},
    {"rank":53,"name":"배준오"},
    {"rank":54,"name":"남민성"},
    {"rank":55,"name":"하창민"},
    {"rank":56,"name":"박서진(남)"},
    {"rank":57,"name":"김형준"},
    {"rank":58,"name":"이윤석"},
    {"rank":59,"name":"김주찬"},
    {"rank":60,"name":"김유찬"},
    {"rank":61,"name":"정의현"},
    {"rank":62,"name":"김서준"},
    {"rank":63,"name":"박지홍"},
    {"rank":64,"name":"박규민"},
    {"rank":65,"name":"송호연"},
    {"rank":66,"name":"우민지"},
    {"rank":67,"name":"김수민"},
    {"rank":68,"name":"박서진(여)"},
    {"rank":69,"name":"주다현"},
    {"rank":70,"name":"김지수"}
  ]'::jsonb;
  v_matches jsonb := '[
    {"sourceKey":"current:5","playedOn":"2026-07-10","challengerName":"남민성","defenderName":"하창민","challengerRank":55,"defenderRank":54,"winnerName":"남민성","winnerScore":6,"loserScore":4,"defenseResult":"방어 실패"},
    {"sourceKey":"current:10","playedOn":"2026-07-12","challengerName":"김서현","defenderName":"정연수","challengerRank":30,"defenderRank":29,"winnerName":"정연수","winnerScore":6,"loserScore":3,"defenseResult":"방어 성공"},
    {"sourceKey":"current:11","playedOn":"2026-07-16","challengerName":"권현준","defenderName":"김진하","challengerRank":8,"defenderRank":5,"winnerName":"김진하","winnerScore":6,"loserScore":3,"defenseResult":"방어 성공"},
    {"sourceKey":"current:12","playedOn":"2026-07-16","challengerName":"김진하","defenderName":"문준상","challengerRank":5,"defenderRank":2,"winnerName":"문준상","winnerScore":6,"loserScore":3,"defenseResult":"방어 성공"},
    {"sourceKey":"current:13","playedOn":"2026-07-19","challengerName":"알료나","defenderName":"문준상","challengerRank":4,"defenderRank":2,"winnerName":"문준상","winnerScore":6,"loserScore":4,"defenseResult":"방어 성공"},
    {"sourceKey":"current:14","playedOn":"2026-07-24","challengerName":"남민성","defenderName":"윤용제","challengerRank":54,"defenderRank":51,"winnerName":"윤용제","winnerScore":6,"loserScore":4,"defenseResult":"방어 성공"},
    {"sourceKey":"current:15","playedOn":"2026-07-27","challengerName":"전하영","defenderName":"이상헌","challengerRank":37,"defenderRank":28,"winnerName":"전하영","winnerScore":6,"loserScore":5,"defenseResult":"방어 실패"}
  ]'::jsonb;
begin
  select club.id
    into v_club_id
  from public.clubs as club
  where club.slug = 'petc';

  if v_club_id is null then
    raise exception 'PETC 동아리를 찾을 수 없습니다.';
  end if;

  select season.id
    into v_season_id
  from public.seasons as season
  where season.club_id = v_club_id
    and season.is_current = true;

  if v_season_id is null then
    raise exception 'PETC 현재 시즌을 찾을 수 없습니다.';
  end if;

  update public.matches
  set status = 'voided',
      updated_at = now()
  where club_id = v_club_id
    and source_key in ('current:2', 'current:3', 'current:4');

  with match_input as (
    select *
    from jsonb_to_recordset(v_matches) as match_row(
      "sourceKey" text,
      "playedOn" date,
      "challengerName" text,
      "defenderName" text,
      "challengerRank" integer,
      "defenderRank" integer,
      "winnerName" text,
      "winnerScore" integer,
      "loserScore" integer,
      "defenseResult" text
    )
  ),
  resolved as (
    select
      v_club_id as club_id,
      v_season_id as season_id,
      match_input."playedOn" as played_on,
      challenger.id as challenger_player_id,
      defender.id as defender_player_id,
      match_input."challengerRank" as challenger_rank_before,
      match_input."defenderRank" as defender_rank_before,
      winner.id as winner_player_id,
      case
        when winner.id = challenger.id then defender.id
        else challenger.id
      end as loser_player_id,
      match_input."winnerScore" as winner_score,
      match_input."loserScore" as loser_score,
      match_input."defenseResult" as defense_result,
      match_input."sourceKey" as source_key
    from match_input
    join public.players as challenger
      on challenger.club_id = v_club_id
     and challenger.normalized_name = match_input."challengerName"
    join public.players as defender
      on defender.club_id = v_club_id
     and defender.normalized_name = match_input."defenderName"
    join public.players as winner
      on winner.club_id = v_club_id
     and winner.normalized_name = match_input."winnerName"
  )
  insert into public.matches (
    club_id,
    season_id,
    played_on,
    challenger_player_id,
    defender_player_id,
    challenger_rank_before,
    defender_rank_before,
    winner_player_id,
    loser_player_id,
    winner_score,
    loser_score,
    defense_result,
    source,
    source_key,
    status
  )
  select
    resolved.club_id,
    resolved.season_id,
    resolved.played_on,
    resolved.challenger_player_id,
    resolved.defender_player_id,
    resolved.challenger_rank_before,
    resolved.defender_rank_before,
    resolved.winner_player_id,
    resolved.loser_player_id,
    resolved.winner_score,
    resolved.loser_score,
    resolved.defense_result,
    'import',
    resolved.source_key,
    'confirmed'
  from resolved
  on conflict (club_id, source_key)
  where source_key is not null
  do update
  set
    season_id = excluded.season_id,
    played_on = excluded.played_on,
    challenger_player_id = excluded.challenger_player_id,
    defender_player_id = excluded.defender_player_id,
    challenger_rank_before = excluded.challenger_rank_before,
    defender_rank_before = excluded.defender_rank_before,
    winner_player_id = excluded.winner_player_id,
    loser_player_id = excluded.loser_player_id,
    winner_score = excluded.winner_score,
    loser_score = excluded.loser_score,
    defense_result = excluded.defense_result,
    source = excluded.source,
    status = 'confirmed',
    updated_at = now();

  if (
    select count(*)
    from public.matches as match_row
    where match_row.club_id = v_club_id
      and match_row.source_key in (
        'current:5',
        'current:10',
        'current:11',
        'current:12',
        'current:13',
        'current:14',
        'current:15'
      )
      and match_row.status = 'confirmed'
  ) <> 7
  or exists (
    select 1
    from public.matches as match_row
    where match_row.club_id = v_club_id
      and match_row.source_key in ('current:2', 'current:3', 'current:4')
      and match_row.status <> 'voided'
  ) then
    raise exception 'PETC 경기 동기화 검증에 실패했습니다.';
  end if;

  perform private.recalculate_season_rankings(v_season_id);

  if (
    select count(*)
    from public.season_players as season_player
    where season_player.season_id = v_season_id
      and season_player.status <> 'left'
  ) <> jsonb_array_length(v_expected_ranking)
  or exists (
    with expected_ranking as (
      select *
      from jsonb_to_recordset(v_expected_ranking) as expected(
        rank integer,
        name text
      )
    )
    select 1
    from expected_ranking
    left join public.players as player
      on player.club_id = v_club_id
     and player.normalized_name = expected_ranking.name
    left join public.season_players as season_player
      on season_player.season_id = v_season_id
     and season_player.player_id = player.id
    where season_player.id is null
       or season_player.current_rank <> expected_ranking.rank
  ) then
    raise exception 'PETC 순위 동기화 검증에 실패했습니다.';
  end if;

  insert into public.ranking_events (
    club_id,
    season_id,
    event_type,
    actor_type,
    payload
  )
  values (
    v_club_id,
    v_season_id,
    'legacy_match_sync',
    'system',
    jsonb_build_object(
      'confirmedMatchCount', 8,
      'voidedSourceKeys', jsonb_build_array(
        'current:2',
        'current:3',
        'current:4'
      ),
      'source', 'PETC Google Sheets'
    )
  );
end;
$migration$;
